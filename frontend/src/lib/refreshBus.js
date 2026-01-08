/**
 * Global Refresh Bus (VERSION-BASED)
 * 
 * Single source of truth for cross-page state invalidation.
 * Uses a monotonically increasing version counter to force React effects.
 * 
 * ⚠️ RULES:
 * - Emit ONLY after successful backend response
 * - Never emit on optimistic updates
 * - Listeners MUST update React state (not call functions directly)
 * - Effects MUST depend on refreshVersion to trigger re-fetch
 */

let version = 0;

/**
 * Emit learning refresh event with version
 * Call after: mark-complete, bookmark add/remove
 */
export function emitLearningRefresh() {
  version += 1;
  window.dispatchEvent(
    new CustomEvent("sv:learning-updated", { detail: { version } })
  );
}

/**
 * Subscribe to learning refresh events
 * @param {Function} callback - Receives version number, use to set state
 * @returns {Function} cleanup function for useEffect
 * 
 * USAGE:
 * useEffect(() => {
 *   return onLearningRefresh(setRefreshVersion);
 * }, []);
 */
export function onLearningRefresh(callback) {
  const handler = (e) => callback(e.detail.version);
  window.addEventListener("sv:learning-updated", handler);
  return () => window.removeEventListener("sv:learning-updated", handler);
}
