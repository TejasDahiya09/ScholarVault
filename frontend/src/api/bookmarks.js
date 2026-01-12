/**
 * Bookmarks API
 * 
 * DESIGN: Presence-based (row exists = bookmarked)
 * NO toggle logic - explicit add/remove only
 */
import client from "./client";

export const bookmarksAPI = {
  /**
   * Get all bookmarked note IDs for current user
   */
  async getBookmarkedNoteIds() {
    const { data } = await client.get("/api/bookmarks");
    return data.noteIds || [];
  },

  // ...existing code...

  /**
   * Add a bookmark (idempotent)
   */
  async addBookmark(noteId, subjectId) {
    const { data } = await client.post("/api/bookmarks", { noteId, subjectId });
    return data;
  },

  /**
   * Remove a bookmark
   */
  async removeBookmark(noteId) {
    const { data } = await client.delete(`/api/bookmarks/${noteId}`);
    return data;
  },
};

export default bookmarksAPI;
