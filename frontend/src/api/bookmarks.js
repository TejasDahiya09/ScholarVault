import client from "./client";

/**
 * Toggle bookmark for a note
 * @param {string} noteId - The ID of the note to bookmark/unbookmark
 * @returns {Promise} Response with isBookmarked status
 */
export const toggleBookmark = async (noteId) => {
  return client.post(`/api/bookmarks/notes/${noteId}`);
};

/**
 * Get all bookmarked note IDs for the current user
 * @returns {Promise} Response with bookmarks array
 */
export const getUserBookmarks = async () => {
  return client.get("/api/bookmarks");
};
