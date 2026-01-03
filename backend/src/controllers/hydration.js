import { supabase } from "../lib/services.js";
import { assertNoError } from "../db/assertWrite.js";

/**
 * State Hydration Controller
 * 
 * Copilot:
 * Bulk endpoint to fetch all user state in one API call.
 * Returns: { bookmarks: [], progress: [] }
 * Benefits:
 * - One API call instead of N
 * - Faster page load
 * - Cleaner frontend logic
 */

/**
 * GET /api/state/hydration
 * Fetch all user bookmarks and progress in parallel
 */
export const getHydration = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("[HYDRATION] Fetching state for user:", userId);

    // Fetch bookmarks and progress in parallel
    const [bookmarksResult, progressResult] = await Promise.all([
      supabase
        .from("user_bookmarks")
        .select("note_id, bookmarked_at")
        .eq("user_id", userId)
        .order("bookmarked_at", { ascending: false }),
      
      supabase
        .from("user_study_progress")
        .select("note_id, subject_id, is_completed, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
    ]);

    // Check for errors
    assertNoError(bookmarksResult.error, `Fetch bookmarks for user ${userId}`);
    assertNoError(progressResult.error, `Fetch progress for user ${userId}`);

    console.log("[HYDRATION] Success:", {
      bookmarks: bookmarksResult.data?.length || 0,
      progress: progressResult.data?.length || 0
    });

    // Return normalized data
    res.json({
      success: true,
      data: {
        bookmarks: bookmarksResult.data || [],
        progress: progressResult.data || [],
        // For backward compatibility with existing frontend code
        bookmarked_note_ids: (bookmarksResult.data || []).map(b => b.note_id),
        completed_note_ids: (progressResult.data || [])
          .filter(p => p.is_completed)
          .map(p => p.note_id)
      }
    });
  } catch (err) {
    console.error("[HYDRATION] Error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch user state" 
    });
  }
};

export default { getHydration };
