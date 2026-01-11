/**
 * Bookmarks API
 * 
 * DESIGN: Presence-based (row exists = bookmarked)
 * Optimistic updates allowed (safe for bookmarks)
 */
import client from "./client";

export const bookmarksAPI = {
  /**
   * Get all bookmarked note IDs for current user
   */
  async getBookmarkedNoteIds() {
    try {
      const { data } = await client.get("/api/bookmarks");
      return data.bookmarks || [];
    } catch (error) {
      console.error("Error fetching bookmarked note IDs:", error);
      return [];
    }
  },

  /**
   * Get bookmarks with full note details
   */
  async getBookmarksWithDetails() {
    try {
      const { data } = await client.get("/api/bookmarks/details");
      return data.bookmarks || [];
    } catch (error) {
      console.error("Error fetching bookmarks with details:", error);
      return [];
    }
  },

  /**
   * Add a bookmark (idempotent)
   */
  async addBookmark(noteId, subjectId) {
    try {
      const { data } = await client.post("/api/bookmarks", { noteId, subjectId });
      return data;
    } catch (error) {
      console.error("Error adding bookmark:", error);
      throw error;
    }
  },

  /**
   * Remove a bookmark
   */
  async removeBookmark(noteId) {
    try {
      const { data } = await client.delete(`/api/bookmarks/${noteId}`);
      return data;
    } catch (error) {
      console.error("Error removing bookmark:", error);
      throw error;
    }
  },
};

export default bookmarksAPI;