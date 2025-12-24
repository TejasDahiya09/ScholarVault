import { supabase } from "../lib/services.js";

// Bookmarks feature restored
const TABLE = "user_bookmarks";
const bookmarksDB = {
	// Get all bookmarked note IDs for a user
	async getBookmarks(userId) {
		const { data, error } = await supabase
			.from(TABLE)
			.select("note_id")
			.eq("user_id", userId);
		if (error) throw new Error(error.message);
		return (data || []).map(row => row.note_id);
	},

	// Toggle bookmark for a note
	async toggleBookmark(userId, noteId) {
		// Check if already bookmarked
		const { data, error } = await supabase
			.from(TABLE)
			.select("id")
			.eq("user_id", userId)
			.eq("note_id", noteId)
			.single();
		if (error && error.code !== "PGRST116") throw new Error(error.message);
		if (data) {
			// Remove bookmark
			const { error: delError } = await supabase
				.from(TABLE)
				.delete()
				.eq("user_id", userId)
				.eq("note_id", noteId);
			if (delError) throw new Error(delError.message);
			return { bookmarked: false };
		} else {
			// Add bookmark
			const { error: insError } = await supabase
				.from(TABLE)
				.insert([{ user_id: userId, note_id: noteId }]);
			if (insError) throw new Error(insError.message);
			return { bookmarked: true };
		}
	}
};
export default bookmarksDB;
