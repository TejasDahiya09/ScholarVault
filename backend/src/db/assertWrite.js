/**
 * Centralized DB Write Assertion Helper
 * 
 * Purpose: Enforce that no Supabase write can succeed silently
 * Usage: Call after every insert/update/delete operation
 * 
 * This prevents the most common Supabase production trap:
 * - Backend thinks write succeeded (returns 200)
 * - Supabase silently rejected write (RLS, permissions, constraints)
 * - Frontend shows success toast
 * - Database never changed
 * 
 * With this helper, all DB write failures are:
 * ✅ Logged with context
 * ✅ Thrown as errors
 * ✅ Never silent
 */

/**
 * Assert that a Supabase operation succeeded
 * @param {Object} error - The error object from Supabase response
 * @param {string} context - Description of the operation (for debugging)
 * @throws {Error} If error exists
 * 
 * @example
 * const { error } = await supabase.from('user_bookmarks').insert({...});
 * assertNoError(error, 'Bookmark insert for user X note Y');
 */
export function assertNoError(error, context) {
  if (error) {
    console.error(`[DB WRITE FAILED] ${context}`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Database write failed: ${context} - ${error.message}`);
  }
}

/**
 * Assert that a Supabase operation returned data
 * @param {*} data - The data from Supabase response
 * @param {string} context - Description of the operation
 * @throws {Error} If data is null/undefined/empty
 * 
 * @example
 * const { data } = await supabase.from('notes').select().single();
 * assertHasData(data, 'Fetch note by ID');
 */
export function assertHasData(data, context) {
  if (!data) {
    console.error(`[DB READ FAILED] ${context} - No data returned`);
    throw new Error(`Database read failed: ${context} - No data found`);
  }
}

/**
 * Wrapper for any Supabase operation with automatic error checking
 * @param {Promise} operation - The Supabase operation
 * @param {string} context - Description for debugging
 * @returns {Promise<any>} The data from the operation
 * @throws {Error} If operation fails
 * 
 * @example
 * const bookmark = await withErrorCheck(
 *   supabase.from('user_bookmarks').insert({...}).select().single(),
 *   'Insert bookmark'
 * );
 */
export async function withErrorCheck(operation, context) {
  const { data, error } = await operation;
  assertNoError(error, context);
  return data;
}

export default {
  assertNoError,
  assertHasData,
  withErrorCheck
};
