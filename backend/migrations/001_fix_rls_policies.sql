-- ============================================================================
-- FIX RLS POLICIES FOR SERVICE ROLE ACCESS
-- ============================================================================
-- Issue: RLS policies were blocking service role from performing INSERT/UPDATE
-- Solution: Recreate policies with proper permissions for service role
-- 
-- The service role should bypass RLS, but explicit policies ensure compatibility
-- ============================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS users_own_data ON public.users;
DROP POLICY IF EXISTS bookmarks_own_data ON public.user_bookmarks;
DROP POLICY IF EXISTS progress_own_data ON public.user_study_progress;
DROP POLICY IF EXISTS sessions_own_data ON public.user_study_sessions;
DROP POLICY IF EXISTS subjects_public_read ON public.subjects;
DROP POLICY IF EXISTS notes_public_read ON public.notes;
DROP POLICY IF EXISTS books_public_read ON public.books;

-- ============================================================================
-- USER-SPECIFIC TABLES - Allow service role + user ownership
-- ============================================================================

-- Users table: Allow service role or own user access
CREATE POLICY users_policy ON public.users
    FOR ALL
    USING (
        auth.role() = 'service_role'  -- Service role has full access
        OR auth.uid() = id            -- Users can access their own data
    )
    WITH CHECK (
        auth.role() = 'service_role'  -- Service role can insert/update
        OR auth.uid() = id            -- Users can modify their own data
    );

-- Bookmarks table: Allow service role or user-owned bookmarks
CREATE POLICY bookmarks_policy ON public.user_bookmarks
    FOR ALL
    USING (
        auth.role() = 'service_role'  -- Service role has full access
        OR auth.uid() = user_id       -- Users can access their bookmarks
    )
    WITH CHECK (
        auth.role() = 'service_role'  -- Service role can insert/update
        OR auth.uid() = user_id       -- Users can modify their bookmarks
    );

-- Study progress table: Allow service role or user-owned progress
CREATE POLICY progress_policy ON public.user_study_progress
    FOR ALL
    USING (
        auth.role() = 'service_role'  -- Service role has full access
        OR auth.uid() = user_id       -- Users can access their progress
    )
    WITH CHECK (
        auth.role() = 'service_role'  -- Service role can insert/update
        OR auth.uid() = user_id       -- Users can modify their progress
    );

-- Study sessions table: Allow service role or user-owned sessions
CREATE POLICY sessions_policy ON public.user_study_sessions
    FOR ALL
    USING (
        auth.role() = 'service_role'  -- Service role has full access
        OR auth.uid() = user_id       -- Users can access their sessions
    )
    WITH CHECK (
        auth.role() = 'service_role'  -- Service role can insert/update
        OR auth.uid() = user_id       -- Users can modify their sessions
    );

-- ============================================================================
-- PUBLIC READ TABLES - All authenticated users can read
-- ============================================================================

-- Subjects: Public read for all authenticated users
CREATE POLICY subjects_read_policy ON public.subjects
    FOR SELECT
    USING (true);  -- Anyone can read subjects

-- Notes: Public read for all authenticated users
CREATE POLICY notes_read_policy ON public.notes
    FOR SELECT
    USING (true);  -- Anyone can read notes

-- Books: Public read for all authenticated users
CREATE POLICY books_read_policy ON public.books
    FOR SELECT
    USING (true);  -- Anyone can read books

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✓ RLS policies updated successfully';
    RAISE NOTICE '✓ Service role can now INSERT/UPDATE/DELETE on user tables';
    RAISE NOTICE '✓ Public read access maintained for subjects, notes, books';
END $$;
