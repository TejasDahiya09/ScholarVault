import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { noCache } from "../middlewares/noCache.js";
import bookmarksDB from "../db/bookmarks.js";
import { supabase } from "../lib/services.js";

const router = Router();

/**
 * GET /api/bookmarks
 * Get all bookmark note IDs for the authenticated user
 */
router.get("/", authenticate, noCache, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const bookmarkIds = await bookmarksDB.getUserBookmarkIds(userId);
    res.json({ noteIds: bookmarkIds });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookmarks/details
 * Get bookmarks with full note details for Dashboard display
 * Returns: { bookmarks: [{ note_id, notes: { id, file_name, subject, subject_id, ... } }] }
 */
router.get("/details", authenticate, noCache, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Get user's bookmark IDs
    const bookmarkIds = await bookmarksDB.getUserBookmarkIds(userId);
    
    if (bookmarkIds.length === 0) {
      return res.json({ bookmarks: [] });
    }

    // Fetch note details for all bookmarked notes
    const { data: notes, error } = await supabase
      .from("notes")
      .select("id, file_name, subject, subject_id, unit_number, semester, branch")
      .in("id", bookmarkIds);

    if (error) throw error;

    // Build bookmark objects with note details
    const bookmarks = bookmarkIds
      .map(noteId => {
        const note = (notes || []).find(n => n.id === noteId);
        return note ? { note_id: noteId, notes: note } : null;
      })
      .filter(Boolean);

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
