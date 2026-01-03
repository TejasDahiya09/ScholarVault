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
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .single();

    if (existing) {
      // Remove bookmark
      const { error } = await supabase
        .from("bookmarks")
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
        .from("bookmarks")
        .insert({
          user_id: userId,
          note_id: noteId,
          bookmark_date: new Date().toISOString()
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
      .from("bookmarks")
      .select("note_id")
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data?.map(b => b.note_id) || [];
  }
};

export default bookmarksDB;
