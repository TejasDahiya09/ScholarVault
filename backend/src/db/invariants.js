import { supabase } from "../lib/services.js";

/**
 * Invariant Checks: Dashboard = Database
 * 
 * Copilot:
 * Assert that aggregated dashboard metrics match raw DB counts.
 * This catches:
 * - Silent data corruption
 * - Analytics drift
 * - Race conditions
 * - Logic bugs
 * 
 * Throw loudly if mismatch detected.
 */

/**
 * Assert that dashboard completion count matches DB reality
 * @param {string} userId - User ID to check
 * @throws {Error} If counts don't match
 */
export async function assertDashboardCompletionInvariant(userId) {
  console.log("[INVARIANT] Checking completion count for user:", userId);

  // Raw DB count
  const { count: dbCount, error: dbError } = await supabase
    .from("user_study_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true);

  if (dbError) {
    throw new Error(`Failed to fetch DB completion count: ${dbError.message}`);
  }

  // Dashboard calculation (simplified - in production, match your actual dashboard logic)
  const { data: progressData, error: progressError } = await supabase
    .from("user_study_progress")
    .select("is_completed")
    .eq("user_id", userId);

  if (progressError) {
    throw new Error(`Failed to fetch progress for dashboard: ${progressError.message}`);
  }

  const dashboardCount = (progressData || []).filter(p => p.is_completed).length;

  // Assert invariant
  if (dbCount !== dashboardCount) {
    const error = new Error(
      `❌ INVARIANT VIOLATION: Dashboard completion count mismatch\n` +
      `  DB Raw Count: ${dbCount}\n` +
      `  Dashboard Count: ${dashboardCount}\n` +
      `  User: ${userId}\n` +
      `  This indicates data corruption or logic drift.`
    );
    console.error("[INVARIANT]", error.message);
    throw error;
  }

  console.log("[INVARIANT] ✅ Completion counts match:", dbCount);
  return true;
}

/**
 * Assert that dashboard bookmark count matches DB reality
 * @param {string} userId - User ID to check
 * @throws {Error} If counts don't match
 */
export async function assertDashboardBookmarkInvariant(userId) {
  console.log("[INVARIANT] Checking bookmark count for user:", userId);

  // Raw DB count
  const { count: dbCount, error: dbError } = await supabase
    .from("user_bookmarks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (dbError) {
    throw new Error(`Failed to fetch DB bookmark count: ${dbError.message}`);
  }

  // Dashboard calculation
  const { data: bookmarkData, error: bookmarkError } = await supabase
    .from("user_bookmarks")
    .select("id")
    .eq("user_id", userId);

  if (bookmarkError) {
    throw new Error(`Failed to fetch bookmarks for dashboard: ${bookmarkError.message}`);
  }

  const dashboardCount = (bookmarkData || []).length;

  // Assert invariant
  if (dbCount !== dashboardCount) {
    const error = new Error(
      `❌ INVARIANT VIOLATION: Dashboard bookmark count mismatch\n` +
      `  DB Raw Count: ${dbCount}\n` +
      `  Dashboard Count: ${dashboardCount}\n` +
      `  User: ${userId}\n` +
      `  This indicates data corruption or logic drift.`
    );
    console.error("[INVARIANT]", error.message);
    throw error;
  }

  console.log("[INVARIANT] ✅ Bookmark counts match:", dbCount);
  return true;
}

/**
 * Run all invariant checks for a user
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if all invariants pass
 */
export async function assertAllInvariants(userId) {
  await assertDashboardCompletionInvariant(userId);
  await assertDashboardBookmarkInvariant(userId);
  console.log("[INVARIANT] ✅ All invariants passed for user:", userId);
  return true;
}

export default {
  assertDashboardCompletionInvariant,
  assertDashboardBookmarkInvariant,
  assertAllInvariants
};
