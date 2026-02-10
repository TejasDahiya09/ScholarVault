import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { noCache } from "../middlewares/noCache.js";
import { studySessionsDB } from "../db/studySessions.js";
import completionsDB from "../db/completions.js";

const router = Router();

/**
 * POST /api/progress/session/start
 * Start a study session for the authenticated user
 */
router.post("/session/start", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startedAt } = req.body;
    const session = await studySessionsDB.startSession(userId, startedAt || new Date());
    res.json({ ok: true, session });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/progress/session/end
 * End the current study session for the authenticated user
 */
router.post("/session/end", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { endedAt } = req.body;
    const session = await studySessionsDB.endSession(userId, endedAt || new Date());
    res.json({ ok: true, session });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/progress/analytics
 * Aggregated analytics for the authenticated user (single source of truth for Dashboard)
 */
router.get("/analytics", authenticate, noCache, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await req.app.locals.userDB.findById(userId);
    const timezone = user?.timezone || "UTC";

    // Fetch all analytics data in parallel — all scoped by user_id and timezone
    const [totalHours, streaks, weeklyMap, completedCount, peakHour] = await Promise.all([
      studySessionsDB.getTotalHours(userId, timezone),
      studySessionsDB.getStreaks(userId, 15, timezone),
      studySessionsDB.getMinutesByDay(userId, 7, timezone),
      completionsDB.getTotalCompletedCount(userId),
      studySessionsDB.getSessionHours(userId, timezone),
    ]);

    // Build weekly activity array (last 7 user-local days)
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      // Shift to user-local day boundary
      const utc = d.getTime() - i * 86400000;
      const local = new Date(
        new Date(utc).toLocaleString("en-US", { timeZone: timezone })
      );
      const dateStr = local.toISOString().slice(0, 10);
      const dayName = local.toLocaleDateString("en-US", { weekday: "short", timeZone: timezone });
      const seconds = weeklyMap.get(dateStr) || 0;
      weekly.push({
        date: dateStr,
        day: dayName,
        minutes: Math.round(seconds / 60),
      });
    }

    res.json({
      stats: {
        totalTimeHours: totalHours,
        completedUnitsTotal: completedCount,
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        peakStudyTime: peakHour,
      },
      weekly,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
