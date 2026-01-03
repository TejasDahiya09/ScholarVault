-- =============================================================================
-- ScholarVault: Bookmark & Mark-as-Complete Feature - Complete DB Setup
-- =============================================================================
-- This script is IDEMPOTENT - Safe to run multiple times
-- It checks for existing objects and only creates what's missing
-- Run this in Supabase SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. VERIFY/CREATE user_bookmarks TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_bookmark UNIQUE(user_id, note_id)
);

-- Add comment
COMMENT ON TABLE public.user_bookmarks IS 'User bookmarked notes for quick access';
COMMENT ON COLUMN public.user_bookmarks.user_id IS 'Reference to authenticated user';
COMMENT ON COLUMN public.user_bookmarks.note_id IS 'Reference to note being bookmarked';
COMMENT ON COLUMN public.user_bookmarks.bookmarked_at IS 'Timestamp when bookmark was created';

-- =============================================================================
-- 2. CREATE INDEXES FOR user_bookmarks
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id 
  ON public.user_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id 
  ON public.user_bookmarks(note_id);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at 
  ON public.user_bookmarks(bookmarked_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created 
  ON public.user_bookmarks(user_id, created_at DESC);

-- =============================================================================
-- 3. ENABLE RLS ON user_bookmarks & CREATE POLICIES
-- =============================================================================

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "user_owns_bookmarks" ON public.user_bookmarks;

-- Create new policy - users can only access their own bookmarks
CREATE POLICY "user_owns_bookmarks"
ON public.user_bookmarks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 4. VERIFY user_study_progress TABLE EXISTS & HAS REQUIRED COLUMNS
-- =============================================================================

-- Table already exists, but verify/add columns if missing
ALTER TABLE public.user_study_progress 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

ALTER TABLE public.user_study_progress 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add comment
COMMENT ON TABLE public.user_study_progress IS 'User study progress and note completion tracking';
COMMENT ON COLUMN public.user_study_progress.is_completed IS 'Whether note is marked as completed';
COMMENT ON COLUMN public.user_study_progress.updated_at IS 'Last update timestamp';

-- =============================================================================
-- 5. CREATE UNIQUE CONSTRAINT ON user_study_progress IF NOT EXISTS
-- =============================================================================

-- Drop the unique index if it exists (replacing with constraint)
DROP INDEX IF EXISTS idx_user_study_progress_user_note;

-- Add a proper UNIQUE CONSTRAINT (required for Supabase upsert)
-- Use DO block to make idempotent (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_study_progress' 
    AND constraint_name = 'user_study_progress_user_note_unique'
  ) THEN
    ALTER TABLE public.user_study_progress
    ADD CONSTRAINT user_study_progress_user_note_unique
    UNIQUE (user_id, note_id);
  END IF;
END $$;

-- =============================================================================
-- 6. CREATE INDEXES FOR user_study_progress QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_study_progress_is_completed 
  ON public.user_study_progress(user_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_user_study_progress_subject_completed 
  ON public.user_study_progress(subject_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_user_study_progress_updated_at 
  ON public.user_study_progress(updated_at DESC);

-- =============================================================================
-- 7. ENABLE RLS ON user_study_progress & CREATE POLICIES
-- =============================================================================

ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "user_owns_progress" ON public.user_study_progress;

-- Create new policy - users can only access their own progress
CREATE POLICY "user_owns_progress"
ON public.user_study_progress
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 8. CREATE TRIGGER FOR auto-updating updated_at (if not exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION update_user_study_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_study_progress_updated_at 
  ON public.user_study_progress;

-- Create trigger
CREATE TRIGGER update_user_study_progress_updated_at
BEFORE UPDATE ON public.user_study_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_study_progress_updated_at();

-- =============================================================================
-- 9. RLS POLICIES ARE SUFFICIENT (GRANT statements not needed)
-- =============================================================================

-- Note: GRANT statements are intentionally omitted.
-- Supabase ignores GRANT for RLS-protected tables.
-- Access is controlled entirely by RLS policies above.
-- This is the recommended Supabase pattern.

-- =============================================================================
-- 10. VERIFICATION & SUMMARY
-- =============================================================================

-- Display table info
DO $$
DECLARE
  bookmark_count INT;
  progress_count INT;
  bookmark_rls BOOLEAN;
  progress_rls BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT COUNT(*) INTO bookmark_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_bookmarks';
  
  SELECT COUNT(*) INTO progress_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_study_progress';
  
  -- Check RLS status
  SELECT rowsecurity INTO bookmark_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_bookmarks';
  
  SELECT rowsecurity INTO progress_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_study_progress';
  
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'ScholarVault Bookmark & Completion Feature - Database Setup Complete';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TABLE STATUS:';
  RAISE NOTICE '  • user_bookmarks: %', CASE WHEN bookmark_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  • user_study_progress: %', CASE WHEN progress_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 ROW LEVEL SECURITY:';
  RAISE NOTICE '  • user_bookmarks RLS: %', CASE WHEN bookmark_rls THEN '✓ ENABLED' ELSE '✗ DISABLED' END;
  RAISE NOTICE '  • user_study_progress RLS: %', CASE WHEN progress_rls THEN '✓ ENABLED' ELSE '✗ DISABLED' END;
  RAISE NOTICE '';
  RAISE NOTICE '📊 INDEXES CREATED:';
  RAISE NOTICE '  • idx_user_bookmarks_user_id';
  RAISE NOTICE '  • idx_user_bookmarks_note_id';
  RAISE NOTICE '  • idx_user_bookmarks_bookmarked_at';
  RAISE NOTICE '  • idx_user_study_progress_is_completed';
  RAISE NOTICE '  • idx_user_study_progress_subject_completed';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 POLICIES CREATED:';
  RAISE NOTICE '  • user_owns_bookmarks (on user_bookmarks)';
  RAISE NOTICE '  • user_owns_progress (on user_study_progress)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ TRIGGERS CREATED:';
  RAISE NOTICE '  • update_user_study_progress_updated_at';
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✨ Database setup complete! Ready for production.';
  RAISE NOTICE '=============================================================================';
END $$;

COMMIT;

-- =============================================================================
-- POST-SETUP VERIFICATION QUERIES
-- =============================================================================
-- Run these manually to verify everything is working:

-- Check user_bookmarks structure
-- SELECT * FROM information_schema.columns 
-- WHERE table_name = 'user_bookmarks' ORDER BY ordinal_position;

-- Check user_study_progress structure
-- SELECT * FROM information_schema.columns 
-- WHERE table_name = 'user_study_progress' ORDER BY ordinal_position;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('user_bookmarks', 'user_study_progress');

-- Check indexes
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes
-- WHERE tablename IN ('user_bookmarks', 'user_study_progress')
-- ORDER BY tablename, indexname;
