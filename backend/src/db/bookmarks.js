import { supabase } from "../lib/services.js";
import { assertNoError } from "./assertWrite.js";

/**
 * Bookmarks Database Operations
 * 
 * Copilot:
 * Use atomic RPC for toggles (eliminates race conditions).
 * RPC function: toggle_bookmark(p_user_id, p_note_id)
 * Returns: boolean (TRUE if bookmarked, FALSE if removed)
 * Fallback to application logic if RPC not available.
 */

// Feature flag: Use RPC-based atomic toggles
const USE_RPC_TOGGLES = true;

const bookmarksDB = {
  /**
   * Toggle bookmark for a note (ATOMIC via RPC)
   * Returns true if bookmarked, false if removed
   */
  async toggleBookmark(userId, noteId) {
    if (USE_RPC_TOGGLES) {
      // Atomic RPC implementation
      console.log("[BOOKMARK RPC] Toggling:", { userId, noteId });
      const { data, error } = await supabase.rpc("toggle_bookmark", {
        p_user_id: userId,
        p_note_id: noteId
      });

      assertNoError(error, `RPC toggle_bookmark for user ${userId} note ${noteId}`);
      console.log("[BOOKMARK RPC] Success, bookmarked:", data);
      return data;
    }

    // Fallback: Original application-side logic
    const { data: existing } = await supabase
      .from("user_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .maybeSingle();

    if (existing) {
      console.log("[BOOKMARK] Removing:", { userId, noteId });
      const { error } = await supabase
        .from("user_bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("note_id", noteId);

      assertNoError(error, `Remove bookmark for user ${userId} note ${noteId}`);
      console.log("[BOOKMARK] Removed successfully");
      return false;
    } else {
      console.log("[BOOKMARK] Adding:", { userId, noteId });
      const { error } = await supabase
        .from("user_bookmarks")
        .insert({
          user_id: userId,
          note_id: noteId,
          bookmarked_at: new Date().toISOString()
        });

      assertNoError(error, `Add bookmark for user ${userId} note ${noteId}`);
      console.log("[BOOKMARK] Added successfully");
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
