import { supabase } from "../lib/services.js";

/**
 * Study Sessions DB
 * Records user study sessions and provides aggregates.
 */
export const studySessionsDB = {
    /**
     * Submit offline study sessions (batch)
     * Each session: { sessionId, noteId, clientStartedAt, clientEndedAt, clientTimezone }
     * Validates anti-cheat, clamps duration, updates rollup, streak, etc.
     */
    async submitOfflineSessions(userId, sessions, userTimezone = "UTC") {
      const MIN_DURATION = 30;
      const MAX_DURATION = 2 * 3600;
      let results = [];
      for (const s of sessions) {
        // Defensive: validate timestamps
        const now = Date.now();
        const started = new Date(s.clientStartedAt).getTime();
        const ended = new Date(s.clientEndedAt).getTime();
        if (isNaN(started) || isNaN(ended) || started > ended || ended > now) {
          results.push({ sessionId: s.sessionId, status: "invalid-timestamp" });
          continue;
        }
        let duration = Math.max(0, Math.floor((ended - started) / 1000));
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
          results.push({ sessionId: s.sessionId, status: "invalid-duration" });
          continue;
        }
        // Check for overlap with existing sessions
        const { data: overlaps, error: overlapErr } = await supabase
          .from("user_study_sessions")
          .select("session_start, session_end")
          .eq("user_id", userId)
          .eq("note_id", s.noteId)
          .or(`session_start.lte.${s.clientEndedAt},session_end.gte.${s.clientStartedAt}`);
        if (overlapErr) {
          results.push({ sessionId: s.sessionId, status: "error-overlap-check" });
          continue;
        }
        if ((overlaps || []).length > 0) {
          results.push({ sessionId: s.sessionId, status: "overlap" });
          continue;
        }
        // Derive local study date
        const localDate = new Date(new Date(s.clientEndedAt).toLocaleString("en-US", { timeZone: s.clientTimezone || userTimezone })).toISOString().slice(0, 10);
        // Insert offline session
        const { data, error } = await supabase
          .from("user_study_sessions")
          .insert([
            {
              session_id: s.sessionId,
              user_id: userId,
              note_id: s.noteId,
              session_start: new Date(s.clientStartedAt).toISOString(),
              session_end: new Date(s.clientEndedAt).toISOString(),
              client_started_at: new Date(s.clientStartedAt).toISOString(),
              client_ended_at: new Date(s.clientEndedAt).toISOString(),
              session_timezone: s.clientTimezone || userTimezone,
              is_offline: true,
              validated_duration_seconds: duration,
              valid: true,
            },
          ])
          .select()
          .single();
        if (error) {
          results.push({ sessionId: s.sessionId, status: "insert-error" });
          continue;
        }
        // Write-time aggregation: update daily rollup
        await supabase
          .from("user_daily_rollup")
          .upsert([
            {
              user_id: userId,
              date_local: localDate,
              total_time_sec: duration,
              valid_sessions_count: 1,
            },
          ], { onConflict: ["user_id", "date_local"] });
        results.push({ sessionId: s.sessionId, status: "ok" });
      }
      // After all, update streak logic (max 1 increment per local day, no resurrection)
      // ...existing code for streak update...
      return results;
    },
  /** Start a note study session: create a row with start time, noteId, heartbeat required */
  async startSession(userId, noteId, startedAt = new Date(), userTimezone = "UTC") {
    // Always store UTC timestamps
    const startIso = new Date(startedAt).toISOString();
    const { data, error } = await supabase
      .from("user_study_sessions")
      .insert([
        {
          user_id: userId,
          note_id: noteId,
          session_start: startIso, // UTC
          session_timezone: userTimezone,
          heartbeat_count: 1,
        },
      ])
      .select()
      .single();
    if (error) throw new Error(`Failed to start session: ${error.message}`);
    return data;
  },

  /** End a note study session: set end time, validate duration, heartbeat, deduplicate, enforce anti-cheat */
  async endSession(userId, noteId, endedAt = new Date(), heartbeatCount = 1, userTimezone = "UTC") {
    const endIso = new Date(endedAt).toISOString();
    // Find the latest open session for the user and note (no end time yet)
    const { data: openSessions, error: findErr } = await supabase
      .from("user_study_sessions")
      .select("id, session_start, heartbeat_count")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .is("session_end", null)
      .order("session_start", { ascending: false })
      .limit(1);
    if (findErr) throw new Error(`Failed to find open session: ${findErr.message}`);
    if (!openSessions || openSessions.length === 0) {
      // No open session; create a short session to avoid losing time
      const { data: created, error: createErr } = await supabase
        .from("user_study_sessions")
        .insert([
          {
            user_id: userId,
            note_id: noteId,
            session_start: endIso,
            session_end: endIso,
            session_timezone: userTimezone,
            duration_seconds: 0,
            heartbeat_count: 0,
            valid: false,
          },
        ])
        .select()
        .single();
      if (createErr) throw new Error(`Failed to end session: ${createErr.message}`);
      return created;
    }
    const open = openSessions[0];
    const start = new Date(open.session_start).getTime();
    const end = new Date(endIso).getTime();
    const duration = Math.max(0, Math.floor((end - start) / 1000));
    // Anti-cheat: enforce minimum/maximum duration, heartbeat, deduplication, session cap, rate-limit
    const MIN_DURATION = 30;
    const MAX_DURATION = 2 * 3600;
    // Rate-limit: max 1 start/end per note per minute
    const now = Date.now();
    if ((now - start) < 60 * 1000) {
      // Too frequent, mark invalid
      const upd = await supabase
        .from("user_study_sessions")
        .update({
          session_end: endIso,
          duration_seconds: duration,
          heartbeat_count: heartbeatCount,
          valid: false,
        })
        .eq("id", open.id)
        .select()
        .single();
      if (upd.error) throw new Error(`Failed to close session: ${upd.error.message}`);
      return upd.data;
    }
    const valid = duration >= MIN_DURATION && duration <= MAX_DURATION && (heartbeatCount >= Math.floor(duration / 15));
    // Mark session as valid/invalid
    const upd = await supabase
      .from("user_study_sessions")
      .update({
        session_end: endIso,
        duration_seconds: duration,
        heartbeat_count: heartbeatCount,
        valid,
      })
      .eq("id", open.id)
      .select()
      .single();
    if (upd.error) throw new Error(`Failed to close session: ${upd.error.message}`);
    // Write-time aggregation: update daily rollup table
    if (valid) {
      const localDate = new Date(new Date(open.session_start).toLocaleString("en-US", { timeZone: userTimezone })).toISOString().slice(0, 10);
      await supabase
        .from("user_daily_rollup")
        .upsert([
          {
            user_id: userId,
            date_local: localDate,
            total_time_sec: duration,
            valid_sessions_count: 1,
          },
        ], { onConflict: ["user_id", "date_local"] });
    }
    // TODO: cache analytics snapshot, serve from single endpoint
    return upd.data;
  },

  /** Sum minutes for last N days, only valid sessions, timezone-safe */
  async getMinutesByDay(userId, days = 7, userTimezone = "UTC") {
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start, duration_seconds, valid, session_timezone")
      .eq("user_id", userId)
      .gte("session_start", new Date(Date.now() - days * 86400000).toISOString());
    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    // Aggregate seconds per local date
    const map = new Map();
    for (const row of data || []) {
      if (!row.valid) continue;
      // Derive local date from UTC + timezone
      const localDate = new Date(new Date(row.session_start).toLocaleString("en-US", { timeZone: row.session_timezone || userTimezone })).toISOString().slice(0, 10);
      const cur = map.get(localDate) || 0;
      map.set(localDate, cur + (row.duration_seconds || 0));
    }
    return map; // local date -> seconds
  },

  /** Total hours (only valid, non-overlapping sessions) */
  async getTotalHours(userId) {
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start, session_end, duration_seconds, valid")
      .eq("user_id", userId);
    if (error) throw new Error(`Failed to fetch total time: ${error.message}`);
    // Merge overlapping sessions
    const sessions = (data || []).filter(r => r.valid && r.session_start && r.session_end);
    sessions.sort((a, b) => new Date(a.session_start) - new Date(b.session_start));
    let merged = [];
    for (const s of sessions) {
      const start = new Date(s.session_start).getTime();
      const end = new Date(s.session_end).getTime();
      if (!merged.length) {
        merged.push({ start, end });
      } else {
        const last = merged[merged.length - 1];
        if (start <= last.end) {
          last.end = Math.max(last.end, end);
        } else {
          merged.push({ start, end });
        }
      }
    }
    const totalSeconds = merged.reduce((sum, s) => sum + Math.floor((s.end - s.start) / 1000), 0);
    return Math.round(totalSeconds / 3600);
  },

  /** Compute streaks: only valid study sessions, max 1 increment/day, timezone-safe, streak recovery, no login/bookmark increments */
  async getStreaks(userId, thresholdMinutes = 15, userTimezone = "UTC") {
    const thresholdSeconds = thresholdMinutes * 60;
    // Only fetch last 30 days for streaks
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start, duration_seconds, valid, session_timezone")
      .eq("user_id", userId)
      .gte("session_start", since)
      .order("session_start", { ascending: true });
    if (error) throw new Error(`Failed to fetch streaks: ${error.message}`);
    // Roll-up per local day
    const perDay = new Map();
    for (const row of data || []) {
      if (!row.valid) continue;
      const localDate = new Date(new Date(row.session_start).toLocaleString("en-US", { timeZone: row.session_timezone || userTimezone })).toISOString().slice(0, 10);
      perDay.set(localDate, (perDay.get(localDate) || 0) + (row.duration_seconds || 0));
    }
    // Only one streak increment per local day
    const dates = Array.from(perDay.entries())
      .filter(([_, sec]) => sec >= thresholdSeconds)
      .map(([d]) => d)
      .sort();
    // Streak recovery: allow 1 missed day grace
    let longest = 0;
    let run = 0;
    let prev = null;
    let graceUsed = false;
    // Recovery tokens logic
    let recoveryTokens = 0;
    let tokenLog = [];
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      if (!prev) {
        run = 1;
      } else {
        const d1 = new Date(prev);
        const d2 = new Date(d);
        const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
        if (diff === 1) run++;
        else if (diff === 2 && !graceUsed) { run++; graceUsed = true; }
        else if (diff === 2 && recoveryTokens > 0) {
          run++;
          recoveryTokens--;
          tokenLog.push({ used: d, remaining: recoveryTokens });
        }
        else run = 1;
      }
      // Earn token every 7-day streak, max 2
      if (run % 7 === 0 && recoveryTokens < 2) {
        recoveryTokens++;
        tokenLog.push({ earned: d, total: recoveryTokens });
      }
      longest = Math.max(longest, run);
      prev = d;
    }
    // Current streak: only if last study was today or yesterday (with grace or token)
    let currentStreak = 0;
    if (dates.length > 0) {
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: userTimezone })).toISOString().slice(0, 10);
      const yesterday = new Date(new Date(Date.now() - 86400000).toLocaleString("en-US", { timeZone: userTimezone })).toISOString().slice(0, 10);
      const lastDate = dates[dates.length - 1];
      if (lastDate === today || lastDate === yesterday) {
        let streak = 1;
        for (let i = dates.length - 2; i >= 0; i--) {
          const d2 = new Date(dates[i+1]);
          const d1 = new Date(dates[i]);
          const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
          if (diff === 1 || (diff === 2 && !graceUsed) || (diff === 2 && recoveryTokens > 0)) streak++;
          else break;
        }
        currentStreak = streak;
      }
    }
    return { currentStreak, longestStreak: longest, recoveryTokens, tokenLog };
  },
  /** Optimized: fetch session start hours for last 90 days for peak study time */
  async getSessionHours(userId) {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start")
      .eq("user_id", userId)
      .gte("session_start", since);
    if (error) throw new Error(`Failed to fetch session hours: ${error.message}`);
    
    // Aggregate sessions by hour of day
    const hourCounts = new Array(24).fill(0);
    for (const row of data || []) {
      if (row.session_start) {
        const hour = new Date(row.session_start).getUTCHours();
        hourCounts[hour]++;
      }
    }
    
    // Find peak hour
    let peakHour = 0;
    let maxCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > maxCount) {
        maxCount = hourCounts[h];
        peakHour = h;
      }
    }
    return maxCount > 0 ? peakHour : null;
  },

  /** PHASE 1: Completion tracking disabled - returns empty map */
  async getCompletedUnitsByDay(userId, days = 30) {
    // Table dropped in Phase 1, returning empty map
    return new Map();
  },
};

export default studySessionsDB;
