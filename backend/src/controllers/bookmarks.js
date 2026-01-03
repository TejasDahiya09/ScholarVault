import bookmarksDB from "../db/bookmarks.js";

/**
 * Toggle bookmark for a note
 * POST /api/bookmarks/notes/:noteId
 */
export const toggleBookmark = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.params;

    if (!noteId) {
      return res.status(400).json({ error: "Note ID is required" });
    }

    const isBookmarked = await bookmarksDB.toggleBookmark(userId, noteId);

    res.json({
      success: true,
      isBookmarked
    });
  } catch (err) {
    console.error("Bookmark toggle error:", err);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
};
