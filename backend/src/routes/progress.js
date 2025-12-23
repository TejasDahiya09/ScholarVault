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
      // Compute the date string for this weekday within the last 7 days
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

    res.json({
      stats: {
        totalTimeHours: totalHours,
        currentStreak,
        longestStreak,
      },
      weekly,
      monthly: month,
    });
  } catch (err) { next(err); }
});

/**
 * Start tracking time for a specific note (invisible to user)
 */
router.post("/note/:noteId/start", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const noteId = req.params.noteId;
    const startedAt = req.body?.startedAt || new Date().toISOString();
    
    // Store in temporary session storage (could use Redis in production)
    // For now, just return OK - frontend will send duration on end
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
