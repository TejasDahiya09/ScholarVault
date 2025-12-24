import { supabase } from "../lib/services.js";
}

export default bookmarksDB;
 */
export const bookmarksDB = {
		const { data, error } = await supabase
			.from("user_bookmarks")
			.insert([
				{
					user_id: userId,
					note_id: noteId,
					bookmarked_at: new Date().toISOString(),
				},
			])
			.select()
			.single();
		if (error) {
			throw new Error(`Failed to add bookmark: ${error.message}`);
		}
		return data;
	},

	/**
	 * Remove a bookmark
	 */
	async removeBookmark(userId, noteId) {
		const { error } = await supabase
			.from("user_bookmarks")
			.delete()
			.eq("user_id", userId)
			.eq("note_id", noteId);
		if (error) {
			throw new Error(`Failed to remove bookmark: ${error.message}`);
		}
		return { success: true };
	},

	/**
	 * Check if note is bookmarked
	 */
	async isBookmarked(userId, noteId) {
		const { data, error } = await supabase
			.from("user_bookmarks")
			.select("id")
			.eq("user_id", userId)
			.eq("note_id", noteId)
			.single();
		if (error && error.code !== "PGRST116") {
			throw new Error(`Database error: ${error.message}`);
		}
		return !!data;
	},

	/**
	 * Get all bookmarked notes for a user
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
	},

	/**
	 * Get bookmarked notes with details
	 */
	async getUserBookmarksWithDetails(userId) {
		const { data, error } = await supabase
			.from("user_bookmarks")
			.select("note_id, notes(*)")
			.eq("user_id", userId)
			.order("bookmarked_at", { ascending: false });
		if (error) {
			throw new Error(`Failed to fetch bookmarks with details: ${error.message}`);
		}
		return data || [];
	},
};

export default bookmarksDB;
import { supabase } from "../lib/services.js";

// Bookmarks feature removed
