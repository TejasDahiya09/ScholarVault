-- ============================================================
-- ENABLE RLS AND USER ISOLATION POLICIES ON USER-OWNED TABLES
-- ============================================================
-- This migration enforces cryptographic data isolation for all user-owned tables.
-- It reverses any previous disabling of RLS and applies strict user_id policies.

-- 1. Enable RLS on bookmarks, completions, study_sessions
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create user isolation policies (auth.uid() = user_id)
-- Bookmarks
DROP POLICY IF EXISTS bookmarks_user_isolation ON bookmarks;
CREATE POLICY bookmarks_user_isolation
  ON bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Completions
DROP POLICY IF EXISTS completions_user_isolation ON completions;
CREATE POLICY completions_user_isolation
  ON completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Study Sessions
DROP POLICY IF EXISTS study_sessions_user_isolation ON study_sessions;
CREATE POLICY study_sessions_user_isolation
  ON study_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Verification (run in SQL editor after migration):
-- select * from bookmarks; -- should only show your rows
-- select * from completions; -- only your rows
-- select * from study_sessions; -- only your rows
-- insert into bookmarks (user_id, note_id) values ('OTHER_USER_ID', 'note'); -- should fail
-- select * from bookmarks where true; -- only your rows

-- 4. Shared tables (notes, subjects) are NOT modified here.
-- ============================================================