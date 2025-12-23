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
 */
router.get("/analytics", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const totalHours = await studySessionsDB.getTotalHours(userId);
    const weeklyMap = await studySessionsDB.getMinutesByDay(userId, 7);
    const monthlyMap = await studySessionsDB.getMinutesByDay(userId, 30);
    const completedMap = await studySessionsDB.getCompletedUnitsByDay(userId, 30);
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

    // Build monthly trend (last 30 days)
    const month = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const minutes = Math.round((monthlyMap.get(dStr) || 0) / 60);
      const completed = completedMap.get(dStr) || 0;
      month.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes,
        completed,
      });
    }

    // Subject time aggregation
    const { data: subjectTimeData } = await supabase
      .from("user_study_progress")
      .select("subject_id, total_time_spent, subjects(name)")
      .eq("user_id", userId);
    
    const subjectTimeMap = new Map();
    for (const row of subjectTimeData || []) {
      if (!row.subject_id) continue;
      const current = subjectTimeMap.get(row.subject_id) || { seconds: 0, name: row.subjects?.name || 'Unknown' };
      current.seconds += (row.total_time_spent || 0);
      subjectTimeMap.set(row.subject_id, current);
    }
    
    const subjectTime = Array.from(subjectTimeMap.entries())
      .map(([id, data]) => ({
        subject_id: id,
        subject_name: data.name,
        hours: Math.round(data.seconds / 3600 * 10) / 10, // 1 decimal
      }))
      .sort((a, b) => b.hours - a.hours);

    // Peak study times analysis
    const { data: sessions } = await supabase
      .from("user_study_sessions")
      .select("session_start")
      .eq("user_id", userId);
    
    const timeBlocks = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    for (const s of sessions || []) {
      const hour = new Date(s.session_start).getHours();
      if (hour >= 5 && hour < 12) timeBlocks.morning++;
      else if (hour >= 12 && hour < 17) timeBlocks.afternoon++;
      else if (hour >= 17 && hour < 21) timeBlocks.evening++;
      else timeBlocks.night++;
    }
    
    const peakTime = Object.entries(timeBlocks)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning';

    // Study velocity (notes completed per week, last 8 weeks)
    const velocity = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const { data: completed } = await supabase
        .from("user_study_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("is_completed", true)
        .gte("updated_at", weekStart.toISOString())
        .lte("updated_at", weekEnd.toISOString());
      
      velocity.push({
        week: `Week ${8 - i}`,
        count: completed?.length || 0,
      });
    }

    res.json({
      stats: {
        totalTimeHours: totalHours,
        currentStreak,
        longestStreak,
        peakStudyTime: peakTime,
      },
      weekly,
      monthly: month,
      subjectTime,
      velocity,
    });
  } catch (err) { next(err); }
});

/**
 * Start tracking time for a specific note (invisible to user)
 * Also increments revisit_count if note is already completed
 */
router.post("/note/:noteId/start", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const noteId = req.params.noteId;
    const startedAt = req.body?.startedAt || new Date().toISOString();
    
    // Check if note is completed, if so increment revisit_count
    const { data: progress } = await supabase
      .from("user_study_progress")
      .select("id, is_completed, revisit_count")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .single();
    
    if (progress && progress.is_completed) {
      // Increment revisit count for completed notes
      await supabase
        .from("user_study_progress")
        .update({ revisit_count: (progress.revisit_count || 0) + 1 })
        .eq("id", progress.id);
    }
    
    res.json({ ok: true, noteId, startedAt });
  } catch (err) { next(err); }
});

/**
 * End note study session and update total_time_spent
 */
router.post("/note/:noteId/end", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const noteId = req.params.noteId;
    const subjectId = req.body?.subjectId;
    const durationSeconds = req.body?.durationSeconds || 0;
    
    if (!subjectId) {
      return res.status(400).json({ error: "subjectId required" });
    }
    
    // Update or create user_study_progress entry
    const { data: existing } = await supabase
      .from("user_study_progress")
      .select("id, total_time_spent")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .single();
    
    if (existing) {
      // Update existing record
      const newTotal = (existing.total_time_spent || 0) + durationSeconds;
      await supabase
        .from("user_study_progress")
        .update({
          total_time_spent: newTotal,
          last_study_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      
      res.json({ ok: true, noteId, totalTimeSpent: newTotal });
    } else {
      // Create new record
      await supabase
        .from("user_study_progress")
        .insert([{
          user_id: userId,
          subject_id: subjectId,
          note_id: noteId,
          total_time_spent: durationSeconds,
          last_study_date: new Date().toISOString().slice(0, 10),
          is_completed: false,
        }]);
      
      res.json({ ok: true, noteId, totalTimeSpent: durationSeconds });
    }
  } catch (err) { next(err); }
});

export default router;
