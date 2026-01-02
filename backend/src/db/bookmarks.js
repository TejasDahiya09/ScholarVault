import { supabase } from "../lib/services.js";

/**
 * Bookmarks Database Operations
 */
export const bookmarksDB = {
  /**
   * Get all bookmarked note IDs for a user
   */
  async getUserBookmarks(userId) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select("note_id")
      .eq("user_id", userId);

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    return data?.map(b => b.note_id) || [];
  },

  /**
   * Get all bookmarked notes with details for a user
   */
  async getUserBookmarksWithDetails(userId) {
    // First get all bookmarked note IDs
    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from("user_bookmarks")
      .select("note_id, bookmarked_at")
      .eq("user_id", userId)
      .order("bookmarked_at", { ascending: false });

    if (bookmarkError) {
      throw new Error(`Failed to fetch bookmarks: ${bookmarkError.message}`);
    }

    if (!bookmarkData || bookmarkData.length === 0) {
      return [];
    }

    // Then get the full note details for those IDs
    const noteIds = bookmarkData.map(b => b.note_id);
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, file_name, subject, subject_id, unit_number, semester, branch, s3_url, created_at")
      .in("id", noteIds);

    if (notesError) {
      throw new Error(`Failed to fetch note details: ${notesError.message}`);
    }

    return notes || [];
  },

  /**
   * Check if a note is bookmarked
   */
  async isBookmarked(userId, noteId) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to check bookmark: ${error.message}`);
    }

    return !!data;
  },

  /**
   * Add a bookmark
   */
  async addBookmark(userId, noteId) {
    console.log("  ➕ Adding bookmark:", { userId, noteId });
    
    const { data, error } = await supabase
      .from("user_bookmarks")
      .insert([{ user_id: userId, note_id: noteId }])
      .select()
      .single();

    if (error) {
      console.error("  ❌ Insert failed:", error);
      // Check if it's a duplicate error
      if (error.code === "23505") {
        return { alreadyExists: true };
      }
      throw new Error(`Failed to add bookmark: ${error.message}`);
    }

    console.log("  ✓ Insert successful:", data);
    return data;
  },

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId, noteId) {
    console.log("  ➖ Removing bookmark:", { userId, noteId });
    
    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("note_id", noteId);

    if (error) {
      console.error("  ❌ Delete failed:", error);
      throw new Error(`Failed to remove bookmark: ${error.message}`);
    }

    console.log("  ✓ Delete successful");
    return true;
  },

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   */
  async toggleBookmark(userId, noteId) {
    console.log("📌 toggleBookmark:", { userId, noteId });
    
    const isCurrentlyBookmarked = await this.isBookmarked(userId, noteId);
    console.log("  Current state:", isCurrentlyBookmarked ? "bookmarked" : "not bookmarked");

    if (isCurrentlyBookmarked) {
      await this.removeBookmark(userId, noteId);
      console.log("  ✓ Bookmark removed");
      return { bookmarked: false };
    } else {
      await this.addBookmark(userId, noteId);
      console.log("  ✓ Bookmark added");
      return { bookmarked: true };
    }
  },
};

export default bookmarksDB;
