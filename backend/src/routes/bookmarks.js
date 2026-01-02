import { Router } from "express";
import bookmarksDB from "../db/bookmarks.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all bookmark routes
router.use(authenticate);

/**
 * Get user's bookmarked note IDs
 * GET /api/bookmarks
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarks(userId);
    res.json({ bookmarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get user's bookmarked notes with full details
 * GET /api/bookmarks/details
 */
router.get("/details", async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarksWithDetails(userId);
    res.json({ bookmarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check if a specific note is bookmarked
 * GET /api/bookmarks/check/:noteId
 */
router.get("/check/:noteId", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.params;
    const isBookmarked = await bookmarksDB.isBookmarked(userId, noteId);
    res.json({ bookmarked: isBookmarked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
