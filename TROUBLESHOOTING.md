# Troubleshooting Guide: Bookmark & Completion Issues

## Current Status
Added detailed logging to help diagnose the exact issue.

## Steps to Diagnose

### 1. Run Backend with Detailed Logs

```bash
cd backend
npm start
```

Watch the console for these log messages:
- `⭐ Toggle bookmark called:` - Shows bookmark request received
- `📌 toggleBookmark:` - Shows database operation started
- `➕ Adding bookmark:` or `➖ Removing bookmark:` - Shows insert/delete attempt
- `✅ Bookmark toggled:` - Shows success
- `❌` messages - Shows errors with details

### 2. Test in Frontend

1. Open ScholarVault app
2. Click bookmark icon (⭐) on any note
3. Check backend console immediately

**Expected console output:**
```
⭐ Toggle bookmark called: { userId: 'xxx', noteId: 'yyy' }
📌 toggleBookmark: { userId: 'xxx', noteId: 'yyy' }
  Current state: not bookmarked
  ➕ Adding bookmark: { userId: 'xxx', noteId: 'yyy' }
  ✓ Insert successful: { id: 'zzz', user_id: 'xxx', note_id: 'yyy', ... }
  ✓ Bookmark added
✅ Bookmark toggled: { bookmarked: true }
```

### 3. Check for Common Errors

#### Error: "new row violates row-level security policy"
**Cause:** RLS policies blocking inserts
**Fix:** Run this in Supabase SQL Editor:
```sql
-- Temporarily disable RLS to test
ALTER TABLE public.user_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_progress DISABLE ROW LEVEL SECURITY;
```

Test if it works. If yes, the issue is RLS policies.

**Permanent Fix:** Run `backend/migrations/001_fix_rls_policies.sql` in Supabase

#### Error: "violates foreign key constraint"
**Cause:** Note ID or User ID doesn't exist in referenced tables
**Check:** 
```sql
-- In Supabase SQL Editor
SELECT id FROM public.notes WHERE id = 'your-note-id';
SELECT id FROM auth.users WHERE id = 'your-user-id';
```

#### Error: "duplicate key value violates unique constraint"
**Cause:** Trying to insert bookmark that already exists
**This is OK:** The code should handle this automatically

#### Error: "relation does not exist"
**Cause:** Tables not created
**Fix:** Run `backend/migrations/000_complete_schema_verification.sql`

### 4. Direct Database Test

Run test script to check database operations directly:

```bash
cd backend
# Edit test-db-operations.js and add real user/note IDs
node test-db-operations.js
```

This will show exactly where the failure is happening.

### 5. Check Network Tab in Browser

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click bookmark icon
4. Look for POST request to `/api/notes/{id}/bookmark`
5. Check:
   - Status code (should be 200)
   - Response body
   - Request payload

**Common issues:**
- Status 401: Not authenticated
- Status 500: Server error (check backend logs)
- Status 400: Missing required data

### 6. Verify RLS is Actually the Issue

Run this in Supabase SQL Editor:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_bookmarks', 'user_study_progress');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('user_bookmarks', 'user_study_progress');
```

### 7. Manual Insert Test

Test if service role can insert directly:

```sql
-- In Supabase SQL Editor (uses service role)
INSERT INTO public.user_bookmarks (user_id, note_id)
VALUES ('your-user-id', 'your-note-id');

INSERT INTO public.user_study_progress (user_id, subject_id, note_id, is_completed)
VALUES ('your-user-id', 'your-subject-id', 'your-note-id', true);
```

If this works, the issue is in the backend code.
If this fails, the issue is database configuration.

## Quick Fixes

### Fix 1: Disable RLS Temporarily (Testing Only)
```sql
ALTER TABLE public.user_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_progress DISABLE ROW LEVEL SECURITY;
```

### Fix 2: Apply Proper RLS Policies
Run: `backend/migrations/001_fix_rls_policies.sql`

### Fix 3: Verify Service Role Key
Check `backend/.env`:
```
SUPABASE_KEY=eyJhbG... (should be service_role key)
```

Decode at jwt.io - should show `"role": "service_role"`

## Report Back

After running backend with logging, share:
1. Console output when clicking bookmark
2. Browser console errors
3. Network tab response
4. Any SQL errors from manual tests

This will help identify the exact issue!
