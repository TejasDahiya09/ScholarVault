import { supabase } from "../lib/services.js";

/**
 * Bookmarks Database Operations
 * 
 * DESIGN: Presence-based (row exists = bookmarked)
 * NO toggle logic - explicit add/remove only
 */
export const bookmarksDB = {
  /**
   * Get all bookmarked note IDs for a user
   */
  async getUserBookmarkIds(userId) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select("note_id")
      .eq("user_id", userId);
    
    if (error) throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    return (data || []).map(r => r.note_id);
  },

  /**
   * Get bookmarks with note details for dashboard
   */
  async getUserBookmarksWithDetails(userId) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select(`
        note_id,
        created_at,
        notes (
          id,
          file_name,
          subject,
          subject_id,
          unit_number,
          semester,
          branch
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    return data || [];
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
    
    if (error) throw new Error(`Failed to check bookmark: ${error.message}`);
    return !!data;
  },

  /**
   * Add bookmark (idempotent - safe to call multiple times)
   * Uses INSERT with ON CONFLICT DO NOTHING
   */
  async addBookmark(userId, noteId) {
    const { error } = await supabase
      .from("user_bookmarks")
      .upsert(
        { user_id: userId, note_id: noteId, created_at: new Date().toISOString() },
        { onConflict: "user_id,note_id", ignoreDuplicates: true }
      );
    
    if (error) throw new Error(`Failed to add bookmark: ${error.message}`);
    return { bookmarked: true };
  },

  /**
   * Remove bookmark (idempotent - safe to call multiple times)
   * Uses DELETE - no error if already deleted
   */
  async removeBookmark(userId, noteId) {
    console.log('[BOOKMARKS] Attempting to delete:', { userId, noteId });
    const { data, error, status, statusText } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("note_id", noteId);
    console.log('[BOOKMARKS] Supabase delete response:', { data, error, status, statusText });
    if (error) {
      console.error('[BOOKMARKS] Delete error:', error);
      throw new Error(`Failed to remove bookmark: ${error.message}`);
    }
    console.log('[BOOKMARKS] Delete successful for:', { userId, noteId });
    return { bookmarked: false };
  },

  /**
   * Count total bookmarks for a user
   */
  async getBookmarkCount(userId) {
    const { count, error } = await supabase
      .from("user_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (error) throw new Error(`Failed to count bookmarks: ${error.message}`);
    return count || 0;
  },
};

export default bookmarksDB;
