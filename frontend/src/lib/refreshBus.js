/**
 * Global Refresh Bus
 * 
 * Single source of truth for cross-page state invalidation.
 * When a mutation changes user learning state, emit a refresh event.
 * All pages that display this data must subscribe and refetch.
 * 
 * ⚠️ RULES:
 * - Emit ONLY after successful backend response
 * - Never emit on optimistic updates
 * - All listeners must refetch from backend (not local state)
 */

export const REFRESH_EVENTS = {
  LEARNING: "sv:learning-updated",  // completion, bookmarks, progress
};

/**
 * Emit learning refresh event
 * Call after: mark-complete, bookmark add/remove
 */
export function emitLearningRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENTS.LEARNING));
}

/**
 * Subscribe to learning refresh events
 * @param {Function} callback - Function to call on refresh
 * @returns {Function} cleanup function for useEffect
 */
export function onLearningRefresh(callback) {
  window.addEventListener(REFRESH_EVENTS.LEARNING, callback);
  return () => window.removeEventListener(REFRESH_EVENTS.LEARNING, callback);
}
