import { Router } from "express";
import bookmarksDB from "../db/bookmarks.js";
import { authenticate } from "../middlewares/auth.js";
import { toggleBookmark } from "../controllers/bookmarks.js";

const router = Router();

/**
 * Toggle bookmark for a note
 */
router.post("/notes/:noteId", authenticate, toggleBookmark);

/**
 * Get all bookmarks for the authenticated user
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarks = await bookmarksDB.getUserBookmarks(userId);
    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
});

export default router;
