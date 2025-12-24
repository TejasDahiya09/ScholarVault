import { supabase } from "../lib/services.js";

const TABLE = "user_bookmarks";

const bookmarksDB = {
	async getUserBookmarks(userId) {
		const { data, error } = await supabase
			.from(TABLE)
			.select("note_id")
			.eq("user_id", userId);
		if (error) throw error;
		return data?.map((row) => row.note_id) || [];
	},

	async addBookmark(userId, noteId) {
		const { error } = await supabase
			.from(TABLE)
			.upsert([{ user_id: userId, note_id: noteId }], { onConflict: ["user_id", "note_id"] });
		if (error) throw error;
		return true;
	},

	async removeBookmark(userId, noteId) {
		const { error } = await supabase
			.from(TABLE)
			.delete()
			.eq("user_id", userId)
			.eq("note_id", noteId);
		if (error) throw error;
		return true;
	},
};

export default bookmarksDB;
