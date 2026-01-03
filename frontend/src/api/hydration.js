import client from "./client";

/**
 * State Hydration API
 * 
 * Copilot:
 * Bulk fetch all user state in one API call.
 * Returns: { bookmarks, progress, bookmarked_note_ids, completed_note_ids }
 * Use this on app initialization for faster load times.
 */

/**
 * Fetch all user state (bookmarks + progress) in one call
 * @returns {Promise} Response with normalized state data
 */
export const getHydration = async () => {
  return client.get("/api/state/hydration");
};

export default { getHydration };
