import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import bookmarksDB from "../db/bookmarks.js";

const router = Router();

/**
 * GET /api/bookmarks
 * Get all bookmark note IDs for the authenticated user
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarkIds = await bookmarksDB.getUserBookmarkIds(userId);
    res.json({ bookmarks: bookmarkIds });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookmarks/details
 * Get bookmarks with note details for dashboard display
 */
router.get("/details", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarksWithDetails(userId);
    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookmarks
 * Add a bookmark for a note
 * Body: { noteId: uuid }
 */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.body;
    
    if (!noteId) {
      return res.status(400).json({ error: "noteId is required" });
    }
    
    await bookmarksDB.addBookmark(userId, noteId);
    res.json({ ok: true, noteId, bookmarked: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bookmarks/:noteId
 * Remove a bookmark for a note
 */
router.delete("/:noteId", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.params;
    
    if (!noteId) {
      return res.status(400).json({ error: "noteId is required" });
    }
    
    await bookmarksDB.removeBookmark(userId, noteId);
    res.json({ ok: true, noteId, bookmarked: false });
  } catch (err) {
    next(err);
  }
});

export default router;
