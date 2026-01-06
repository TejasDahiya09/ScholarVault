import { supabase } from "../lib/services.js";

/**
 * Bookmarks Database Operations
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
		if (error) {
			throw new Error(`Failed to fetch bookmarks: ${error.message}`);
		}
		return (data || []).map(r => r.note_id);
	},

	/**
	 * Get bookmark details with note fields
	 */
	async getUserBookmarksWithNotes(userId) {
		const noteIds = await this.getUserBookmarkIds(userId);
		if ((noteIds || []).length === 0) return [];

		const { data, error } = await supabase
			.from("notes")
			.select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at")
			.in("id", noteIds);
		if (error) {
			throw new Error(`Failed to fetch bookmarked notes: ${error.message}`);
		}
		// Return array of { note_id, notes: {...} }
		return (data || []).map(n => ({ note_id: n.id, notes: n }));
	},

	/**
	 * Toggle bookmark for a note
	 * Returns { bookmarked: boolean }
	 */
	async toggleBookmark(userId, noteId) {
		// Check existing
		const { data: existing, error: selError } = await supabase
			.from("user_bookmarks")
			.select("id")
			.eq("user_id", userId)
			.eq("note_id", noteId)
			.maybeSingle();
		if (selError && selError.code !== "PGRST116") {
			throw new Error(`Database error: ${selError.message}`);
		}

		if (existing?.id) {
			const { error } = await supabase
				.from("user_bookmarks")
				.delete()
				.eq("id", existing.id);
			if (error) {
				throw new Error(`Failed to remove bookmark: ${error.message}`);
			}
			return { bookmarked: false };
		}

		const { error: insError } = await supabase
			.from("user_bookmarks")
			.insert([{ user_id: userId, note_id: noteId, bookmarked_at: new Date().toISOString() }]);
		if (insError) {
			throw new Error(`Failed to add bookmark: ${insError.message}`);
		}
		return { bookmarked: true };
	},
};

export default bookmarksDB;
