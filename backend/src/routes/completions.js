import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import completionsDB from "../db/completions.js";

const router = Router();

/**
 * GET /api/completions
 * Get all completed note IDs for the authenticated user
 * Optional query: ?subjectId=uuid to filter by subject
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subjectId } = req.query;
    
    const completedIds = await completionsDB.getCompletedNoteIds(userId, subjectId || null);
    res.json({ completions: completedIds });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/completions/count
 * Get total completed notes count for the user
 */
router.get("/count", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await completionsDB.getTotalCompletedCount(userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/completions
 * Mark a note as completed
 * Body: { noteId: uuid, subjectId: uuid }
 */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { noteId, subjectId } = req.body;
    
    if (!noteId) {
      return res.status(400).json({ error: "noteId is required" });
    }
    if (!subjectId) {
      return res.status(400).json({ error: "subjectId is required" });
    }
    
    await completionsDB.markComplete(userId, noteId, subjectId);
    
    // Return fresh progress for immediate UI sync
    const progress = await completionsDB.getSubjectProgress(userId, subjectId);
    
    res.json({
      ok: true,
      noteId,
      subjectId,
      completed: true,
      progress,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/completions/:noteId
 * Mark a note as incomplete (remove completion)
 */
router.delete("/:noteId", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.params;
    const { subjectId } = req.query;
    
    if (!noteId) {
      return res.status(400).json({ error: "noteId is required" });
    }
    
    await completionsDB.markIncomplete(userId, noteId);
    
    // Return fresh progress if subjectId provided
    let progress = null;
    if (subjectId) {
      progress = await completionsDB.getSubjectProgress(userId, subjectId);
    }
    
    res.json({
      ok: true,
      noteId,
      completed: false,
      progress,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
