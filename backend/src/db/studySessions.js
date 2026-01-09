import { supabase } from "../lib/services.js";

/**
 * Study Sessions DB
 * Records user study sessions and provides aggregates.
 */
export const studySessionsDB = {
  /** Start a session: create a row with start time; leave end null */
  async startSession(userId, startedAt = new Date()) {
    const startIso = new Date(startedAt).toISOString();
    const dateStr = startIso.slice(0, 10); // YYYY-MM-DD

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

  /** End a session: set end time and compute duration */
  async endSession(userId, endedAt = new Date()) {
    const endIso = new Date(endedAt).toISOString();

    // Find the latest open session for the user (no end time yet)
    const { data: openSessions, error: findErr } = await supabase
      .from("user_study_sessions")
      .select("id, session_start")
      .eq("user_id", userId)
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
            session_start: endIso,
            session_end: endIso,
            session_date: endIso.slice(0, 10),
            duration_seconds: 0,
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

    const startDateStr = new Date(open.session_start).toISOString().slice(0, 10);
    const endDateStr = new Date(endIso).toISOString().slice(0, 10);

    let data;
    if (startDateStr !== endDateStr) {
      // Split across midnight
      const midnight = new Date(startDateStr + 'T23:59:59.999Z').getTime();
      const part1 = Math.max(0, Math.floor((midnight - start + 1) / 1000));
      const part2 = Math.max(0, duration - part1);

      // Update original row to part1 only
      const upd = await supabase
        .from("user_study_sessions")
        .update({
          session_end: new Date(midnight).toISOString(),
          duration_seconds: part1,
        })
        .eq("id", open.id)
        .select()
        .single();
      if (upd.error) throw new Error(`Failed to close split session: ${upd.error.message}`);

      // Insert new row for the remaining part on end date
      const ins = await supabase
        .from("user_study_sessions")
        .insert([
          {
            user_id: userId,
            session_start: endIso,
            session_end: endIso,
            session_date: endDateStr,
            duration_seconds: part2,
          },
        ])
        .select()
        .single();
      if (ins.error) throw new Error(`Failed to insert split session tail: ${ins.error.message}`);
      data = ins.data;
    } else {
      const upd = await supabase
        .from("user_study_sessions")
        .update({
          session_end: endIso,
          duration_seconds: duration,
        })
        .eq("id", open.id)
        .select()
        .single();
      if (upd.error) throw new Error(`Failed to close session: ${upd.error.message}`);
      data = upd.data;
    }

    return data;
  },

  /** Sum minutes for last N days */
  async getMinutesByDay(userId, days = 7) {
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_date, duration_seconds")
      .eq("user_id", userId)
      .gte("session_date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10));

    if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);

    // Aggregate seconds per date
    const map = new Map();
    for (const row of data || []) {
      const cur = map.get(row.session_date) || 0;
      map.set(row.session_date, cur + (row.duration_seconds || 0));
    }

    return map; // date -> seconds
  },

  /** Total hours (fetch all and aggregate in JS) */
  async getTotalHours(userId) {
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("duration_seconds")
      .eq("user_id", userId);
    if (error) throw new Error(`Failed to fetch total time: ${error.message}`);
    const totalSeconds = (data || []).reduce((s, r) => s + (r.duration_seconds || 0), 0);
    return Math.round(totalSeconds / 3600);
  },

  /** Compute streaks from activity days with threshold minutes (optimized) */
  async getStreaks(userId, thresholdMinutes = 15) {
    const thresholdSeconds = thresholdMinutes * 60;
    // Only fetch last 30 days for streaks
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("user_study_sessions")
      .select("session_date, duration_seconds")
      .eq("user_id", userId)
      .gte("session_date", since)
      .order("session_date", { ascending: true });
    if (error) throw new Error(`Failed to fetch streaks: ${error.message}`);
    
    // Roll-up per day in JS
    const perDay = new Map();
    for (const row of data || []) {
      perDay.set(row.session_date, (perDay.get(row.session_date) || 0) + (row.duration_seconds || 0));
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
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const lastDate = dates[dates.length - 1];

      // Streak is active only if last study was Today or Yesterday
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
