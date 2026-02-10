import { supabase } from "../lib/services.js";

/**
 * Study Sessions DB
 * Records user study sessions and provides aggregates.
 */
export const studySessionsDB = {
  /** Start a session: idempotent, only one open at a time */
  async startSession(userId, startedAt = new Date()) {
    // Check for existing open session
    const { data: openSessions, error: findErr } = await supabase
      .from("user_study_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("session_end", null)
      .limit(1);
    if (findErr) throw new Error(`Failed to check open session: ${findErr.message}`);
    if (openSessions && openSessions.length > 0) {
      return openSessions[0];
    }
    // No open session, create new
    const startIso = new Date(startedAt).toISOString();
    const dateStr = startIso.slice(0, 10);
    const { data, error } = await supabase
      .from("user_study_sessions")
      .insert([
        {
          user_id: userId,
          session_start: startIso,
          session_date: dateStr,
        },
      ])
      .select()
      .single();
    if (error) throw new Error(`Failed to start session: ${error.message}`);
    return data;
  },

  /** End all open sessions for user: set end time and compute duration for all */
  async endSession(userId, endedAt = new Date()) {
    const endIso = new Date(endedAt).toISOString();
    // Find all open sessions for the user (no end time yet)
    const { data: openSessions, error: findErr } = await supabase
      .from("user_study_sessions")
      .select("id, session_start")
      .eq("user_id", userId)
      .is("session_end", null);
    if (findErr) throw new Error(`Failed to find open sessions: ${findErr.message}`);
    if (!openSessions || openSessions.length === 0) {
      // No open session; create a short session to avoid losing time
      const { data: created, error: createErr } = await supabase
        .from("user_study_sessions")
        .insert([
          {
            user_id: userId,
            session_start: endIso,
            session_end: endIso,
            session_date: endIso.slice(0, 10),
            duration_seconds: 0,
          },
        ])
        .select()
        .single();
      if (createErr) throw new Error(`Failed to end session: ${createErr.message}`);
      return { closed: 0, created };
    }
    let closed = 0;
    for (const open of openSessions) {
      const start = new Date(open.session_start).getTime();
      const end = new Date(endIso).getTime();
      const duration = Math.max(0, Math.floor((end - start) / 1000));
      await supabase
        .from("user_study_sessions")
        .update({
          session_end: endIso,
          duration_seconds: duration,
        })
        .eq("id", open.id);
      closed++;
    }
    return { closed };
  },

  /** Sum minutes for last N days (only closed sessions) */
  async getMinutesByDay(userId, days = 7, timezone = "UTC") {
    // Calculate user-local day boundaries
    const now = new Date();
    const end = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    const startStr = start.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start, session_end, duration_seconds")
      .eq("user_id", userId)
      .not("session_end", "is", null)
      .gte("session_start", startStr);
    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
    // Aggregate seconds per user-local date
    const map = new Map();
    for (const row of data || []) {
      const localDate = new Date(row.session_start).toLocaleString("en-US", { timeZone: timezone });
      const dateStr = new Date(localDate).toISOString().slice(0, 10);
      const cur = map.get(dateStr) || 0;
      map.set(dateStr, cur + (row.duration_seconds || 0));
    }
    return map; // user-local date -> seconds
  },

  /** Total hours (only closed sessions) */
  async getTotalHours(userId, timezone = "UTC") {
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("duration_seconds, session_end")
      .eq("user_id", userId)
      .not("session_end", "is", null);
    if (error) throw new Error(`Failed to fetch total time: ${error.message}`);
    const totalSeconds = (data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0);
    return Math.round(totalSeconds / 3600);
  },

  /** Compute streaks from activity days with threshold minutes (optimized) */
  async getStreaks(userId, thresholdMinutes = 15, timezone = "UTC") {
    const thresholdSeconds = thresholdMinutes * 60;
    // Only fetch last 30 user-local days for streaks
    const now = new Date();
    const end = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const since = new Date(end.getTime() - 29 * 86400000);
    const sinceStr = since.toISOString();
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start, duration_seconds")
      .eq("user_id", userId)
      .not("session_start", "is", null)
      .gte("session_start", sinceStr)
      .order("session_start", { ascending: true });
    if (error) throw new Error(`Failed to fetch streaks: ${error.message}`);
    // Roll-up per user-local day
    const perDay = new Map();
    for (const row of data || []) {
      const localDate = new Date(row.session_start).toLocaleString("en-US", { timeZone: timezone });
      const dateStr = new Date(localDate).toISOString().slice(0, 10);
      perDay.set(dateStr, (perDay.get(dateStr) || 0) + (row.duration_seconds || 0));
    }
    // Get valid study dates (sorted ASC)
    const dates = Array.from(perDay.entries())
      .filter(([_, sec]) => sec >= thresholdSeconds)
      .map(([d]) => d)
      .sort();
    // Calculate Longest Streak
    let longest = 0;
    let run = 0;
    let prev = null;
    for (const d of dates) {
      if (!prev) {
        run = 1;
      } else {
        const d1 = new Date(prev);
        const d2 = new Date(d);
        const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
        if (diff === 1) run++;
        else run = 1;
      }
      longest = Math.max(longest, run);
      prev = d;
    }
    // Calculate Current Streak
    let currentStreak = 0;
    if (dates.length > 0) {
      // Today and yesterday in user-local time
      const today = new Date(end).toISOString().slice(0, 10);
      const yesterday = new Date(end.getTime() - 86400000).toISOString().slice(0, 10);
      const lastDate = dates[dates.length - 1];
      if (lastDate === today || lastDate === yesterday) {
        let streak = 1;
        for (let i = dates.length - 2; i >= 0; i--) {
          const d2 = new Date(dates[i+1]);
          const d1 = new Date(dates[i]);
          const diff = Math.round((d2 - d1) / (1000 * 3600 * 24));
          if (diff === 1) streak++;
          else break;
        }
        currentStreak = streak;
      }
    }
    return { currentStreak, longestStreak: longest };
  },
  /** Optimized: fetch session start hours for last 90 days for peak study time */
  async getSessionHours(userId, timezone = "UTC") {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_start")
      .eq("user_id", userId)
      .gte("session_start", since);
    if (error) throw new Error(`Failed to fetch session hours: ${error.message}`);
    // Aggregate sessions by user-local hour of day
    const hourCounts = new Array(24).fill(0);
    for (const row of data || []) {
      if (row.session_start) {
        const localDate = new Date(row.session_start).toLocaleString("en-US", { timeZone: timezone });
        const hour = new Date(localDate).getHours();
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
