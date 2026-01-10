-- ============================================================
-- DISABLE RLS ON BOOKMARK AND COMPLETION TABLES
-- ============================================================
-- 
-- WHY: The backend uses its own JWT authentication and filters
-- by user_id explicitly in every query. RLS is redundant and
-- can cause silent failures if policies are missing.
--
-- If RLS was enabled by Supabase default, DELETEs return success
-- but don't actually delete rows (no matching policy).
-- ============================================================

-- Disable RLS on bookmarks
ALTER TABLE user_bookmarks DISABLE ROW LEVEL SECURITY;

-- Disable RLS on completions
ALTER TABLE user_note_completions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_bookmarks', 'user_note_completions');
-- Both should show rowsecurity = false
