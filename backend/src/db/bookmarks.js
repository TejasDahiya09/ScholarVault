import { supabase } from "../lib/services.js";

/**
 * Bookmarks Database Operations
 */
const bookmarksDB = {
  /**
   * Toggle bookmark for a note
   * Returns true if bookmarked, false if removed
   */
  async toggleBookmark(userId, noteId) {
    // Check if bookmark exists
    const { data: existing } = await supabase
      .from("user_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .maybeSingle();

    if (existing) {
      // Remove bookmark
      const { error } = await supabase
        .from("user_bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("note_id", noteId);

      if (error) {
        throw new Error(`Failed to remove bookmark: ${error.message}`);
      }
      return false;
    } else {
      // Add bookmark
      const { error } = await supabase
        .from("user_bookmarks")
        .insert({
          user_id: userId,
          note_id: noteId,
          bookmarked_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to add bookmark: ${error.message}`);
      }
      return true;
    }
  },

  /**
   * Get all bookmarked note IDs for a user
   */
  async getUserBookmarks(userId) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select("note_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data?.map(b => b.note_id) || [];
  }
};

export default bookmarksDB;
