// IMPORTANT:
// bookmarks.subject_id is REQUIRED
// DB enforces UNIQUE (user_id, note_id, subject_id)
// Never insert without subject_id

import { supabase } from "../lib/services.js";

// Bookmarks DB helpers (contract-compliant)
const bookmarksDB = {
  // Get all bookmarked note IDs for a user
  async getUserBookmarkIds(userId) {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("note_id")
      .eq("user_id", userId);
    if (error) throw error;
    return (data || []).map(r => r.note_id);
  },

  // Add a bookmark
  async addBookmark(userId, noteId, subjectId) {
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: userId, note_id: noteId, subject_id: subjectId });
    if (error) throw error;
    return { bookmarked: true };
  },

  // Remove a bookmark
  async removeBookmark(userId, noteId) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("note_id", noteId);
    if (error) throw error;
    return { bookmarked: false };
  },
};

export default bookmarksDB;
