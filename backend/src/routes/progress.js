import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import studySessionsDB from "../db/studySessions.js";
import { supabase } from "../lib/services.js";

const router = Router();

/**
 * Start a user study session
 */
router.post("/session/start", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const startedAt = req.body?.startedAt ? new Date(req.body.startedAt) : new Date();
    const row = await studySessionsDB.startSession(userId, startedAt);
    res.json({ ok: true, sessionId: row.id, startedAt: row.session_start });
  } catch (err) { next(err); }
});

/**
 * End the most recent open session for user
 */
router.post("/session/end", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const endedAt = req.body?.endedAt ? new Date(req.body.endedAt) : new Date();
    const row = await studySessionsDB.endSession(userId, endedAt);
    res.json({ ok: true, sessionId: row.id, endedAt: row.session_end, durationSeconds: row.duration_seconds || 0 });
  } catch (err) { next(err); }
});

/**
 * Get analytics for Progress page
 * PHASE 1: Only session-based analytics (no completion data)
 */
router.get("/analytics", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const totalHours = await studySessionsDB.getTotalHours(userId);
    const weeklyMap = await studySessionsDB.getMinutesByDay(userId, 7);
    const monthlyMap = await studySessionsDB.getMinutesByDay(userId, 30);
    const { currentStreak, longestStreak } = await studySessionsDB.getStreaks(userId, 15);

    // Build weekly array: Sun..Sat order
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayIdx = new Date().getDay();
    const weekly = days.map((label, idx) => {
      const date = new Date();
      const diff = ((todayIdx - idx + 7) % 7);
      date.setDate(date.getDate() - diff);
      const dStr = date.toISOString().slice(0, 10);
      const seconds = weeklyMap.get(dStr) || 0;
      return { day: label, minutes: Math.round(seconds / 60), isToday: idx === todayIdx };
    });

    // Build monthly trend (last 30 days) - NO completion data for Phase 1
    const month = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const minutes = Math.round((monthlyMap.get(dStr) || 0) / 60);
      month.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes,
        completed: 0, // Placeholder until Phase 2 rebuild
      });
    }

    // Peak study times analysis (from sessions only)
    const { data: sessions } = await supabase
      .from("user_study_sessions")
      .select("session_start")
      .eq("user_id", userId);

    let peakTime = null;
    if ((sessions?.length || 0) >= 3) {
      const timeBlocks = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      for (const s of sessions || []) {
        const hour = new Date(s.session_start).getHours();
        if (hour >= 5 && hour < 12) timeBlocks.morning++;
        else if (hour >= 12 && hour < 17) timeBlocks.afternoon++;
        else if (hour >= 17 && hour < 21) timeBlocks.evening++;
        else timeBlocks.night++;
      }
      peakTime = Object.entries(timeBlocks)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }

    res.json({
      stats: {
        totalTimeHours: totalHours,
        currentStreak,
        longestStreak,
        peakStudyTime: peakTime,
        completedUnitsTotal: 0, // Placeholder until Phase 2 rebuild
      },
      weekly,
      monthly: month,
      subjectTime: [], // Placeholder until Phase 2 rebuild
      velocity: [], // Placeholder until Phase 2 rebuild
    });
  } catch (err) { next(err); }
});

export default router;
