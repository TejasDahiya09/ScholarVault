import { Router } from "express";
import bookmarksDB from "../db/bookmarks.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

/**
 * Get user's bookmarked note IDs
 * GET /api/bookmarks
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarks(userId);
    
    res.json({
      bookmarks,
      count: bookmarks.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get user's bookmarks with note details
 * GET /api/bookmarks/details
 */
router.get("/details", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarksWithDetails(userId);
    
    res.json({
      bookmarks,
      count: bookmarks.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
