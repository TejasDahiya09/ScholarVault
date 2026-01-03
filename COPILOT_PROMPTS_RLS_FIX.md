# GitHub Copilot Prompts: RLS Bypass Fix

## Problem Summary
**Symptom:** Toast messages show success ("✓ Marked as complete!", "Bookmark added") but nothing changes in UI, database, or dashboard.

**Root Cause:** Backend Supabase client was not using service role key, causing all writes to silently fail due to RLS (Row Level Security) restrictions.

---

## Fix 1: Backend Supabase Client (MANDATORY)

**File:** `backend/src/lib/services.js`

```javascript
/**
 * Copilot:
 * This is a backend-only Supabase client.
 * Requirements:
 * - Use SUPABASE_SERVICE_ROLE_KEY environment variable (NOT anon key)
 * - RLS is enabled on tables, so service role key is required for writes
 * - Set auth.persistSession = false
 * - Set auth.autoRefreshToken = false
 * - Never expose this key to frontend
 * 
 * Create the client with these exact options.
 */
```

**Expected Output:**
```javascript
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);
```

---

## Fix 2: Database Layer Error Handling

**File:** `backend/src/db/bookmarks.js`

```javascript
/**
 * Copilot:
 * Update toggleBookmark function to:
 * - Check if `error` exists after every Supabase operation
 * - If error exists, console.error the error details
 * - Throw the error with descriptive message
 * - Add debug logs before and after each operation
 * - Log format: [BOOKMARK] Action: { userId, noteId }
 * 
 * Never return success if the database write failed.
 */
```

**File:** `backend/src/db/progress.js`

```javascript
/**
 * Copilot:
 * Update toggleCompletion function to:
 * - Check if `error` exists after every Supabase insert/update
 * - If error exists, console.error the error details
 * - Throw the error with descriptive message
 * - Add debug logs: [PROGRESS] Action: { userId, noteId, newValue }
 * 
 * Never return data if the database write failed.
 */
```

---

## Fix 3: Frontend Success Validation

**File:** `frontend/src/pages/Notes/NotesPage.jsx`

```javascript
/**
 * Copilot:
 * Update handleToggleBookmark to:
 * - Call toggleBookmark API
 * - Check if response.data.success === true
 * - Only show success toast if backend confirms success
 * - Update UI state from response.data.isBookmarked
 * - Show error toast if request fails or success !== true
 * - Do NOT use optimistic UI updates
 */
```

```javascript
/**
 * Copilot:
 * Update handleMarkComplete to:
 * - Call toggleCompletion API
 * - Check if response.data.success === true
 * - Only show "✓ Marked as complete!" if backend confirms
 * - Update UI state from response.data.isCompleted
 * - Show error toast if request fails or success !== true
 * - Do NOT use optimistic UI updates
 */
```

---

## Fix 4: Environment Variable Setup

**File:** `backend/.env`

```bash
# Copilot: Add this line to .env
# This is the service role key that bypasses RLS
# NEVER commit this to git or expose to frontend
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-supabase-dashboard"
```

**File:** `backend/src/config.js`

```javascript
/**
 * Copilot:
 * Add SUPABASE_SERVICE_ROLE_KEY to the config object:
 * - Read from process.env.SUPABASE_SERVICE_ROLE_KEY
 * - Place it after SUPABASE_KEY in the Database section
 */
```

---

## Fix 5: Authentication Middleware Verification

**File:** `backend/src/routes/*.js`

```javascript
/**
 * Copilot:
 * Ensure all protected routes use authenticate middleware:
 * - Import authenticate from middlewares/auth.js
 * - Apply to all bookmark and progress routes
 * - Middleware must set req.user.userId from JWT
 * - Routes should reject requests without Authorization header
 */
```

---

## Debug Verification Checklist

### Backend Logs Should Show:
```
[BOOKMARK] Adding: { userId: '...', noteId: '...' }
[BOOKMARK] Added successfully

[PROGRESS] Updating: { userId: '...', noteId: '...', newValue: true }
[PROGRESS] Updated successfully
```

### Network Tab Should Show:
```
POST /api/bookmarks/notes/:noteId
Status: 200
Headers:
  Authorization: Bearer <JWT-token>
Response:
  { "success": true, "isBookmarked": true }
```

### Database Should Show:
```sql
-- Check bookmark exists
SELECT * FROM user_bookmarks WHERE user_id = 'xxx' AND note_id = 'yyy';

-- Check completion status
SELECT is_completed FROM user_study_progress WHERE user_id = 'xxx' AND note_id = 'yyy';
```

---

## Testing Workflow

1. **Restart backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Open browser DevTools → Network tab**

3. **Click bookmark button**
   - Check backend logs for `[BOOKMARK]` messages
   - Verify 200 response with `success: true`
   - Verify row appears in Supabase `user_bookmarks` table

4. **Refresh page**
   - Bookmark should still be visible
   - UI state should match DB state

5. **Click mark as complete**
   - Check backend logs for `[PROGRESS]` messages
   - Verify 200 response with `success: true, isCompleted: true`
   - Verify `is_completed = true` in Supabase `user_study_progress` table

6. **Check dashboard**
   - Completion percentage should update
   - Analytics should reflect new state

---

## Common Pitfalls to Avoid

❌ **WRONG:** Using anon key in backend
```javascript
createClient(url, process.env.SUPABASE_ANON_KEY)
```

✅ **CORRECT:** Using service role key in backend
```javascript
createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
```

---

❌ **WRONG:** Ignoring errors
```javascript
await supabase.from(...).insert(...);
return true; // Always returns success
```

✅ **CORRECT:** Throwing on errors
```javascript
const { error } = await supabase.from(...).insert(...);
if (error) throw error;
return true;
```

---

❌ **WRONG:** Optimistic UI without validation
```javascript
setBookmarked(true);
await toggleBookmark(noteId);
```

✅ **CORRECT:** Update UI from response
```javascript
const res = await toggleBookmark(noteId);
setBookmarked(res.data.isBookmarked);
```

---

## Expected Results After Fix

| Feature | Before Fix | After Fix |
|---------|-----------|-----------|
| Toast messages | ✅ Shows | ✅ Shows (only on real success) |
| UI updates | ❌ No change | ✅ Updates instantly |
| Database writes | ❌ Silent failure | ✅ Writes persist |
| Page refresh | ❌ State lost | ✅ State persists |
| Dashboard | ❌ No update | ✅ Updates correctly |
| Error logs | ❌ Silent | ✅ Logged and thrown |

---

## Summary

**Root Cause:** Backend using anon key instead of service role key under RLS.

**Solution:** Switch to service role key + throw errors + validate success responses.

**Validation:** Logs show operations + Database contains rows + UI persists on refresh.

This fix ensures the backend can bypass RLS correctly while maintaining security through JWT authentication at the application level.
