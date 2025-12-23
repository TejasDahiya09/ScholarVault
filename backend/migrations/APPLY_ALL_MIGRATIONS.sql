-- Master Migration Script: Apply All Pending Migrations
-- Date: 2025-12-23
-- Description: Combines migrations 007 and 008 for complete database setup
-- Run this in Supabase SQL Editor to apply all changes at once

-- ============================================================
-- MIGRATION 007: Create user_study_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ NULL,
  session_date DATE NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast aggregation and queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.user_study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.user_study_sessions(user_id, session_date);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at_sessions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_touch ON public.user_study_sessions;
CREATE TRIGGER trg_sessions_touch
BEFORE UPDATE ON public.user_study_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_sessions();

COMMENT ON TABLE public.user_study_sessions IS 'Tracks user study sessions for time analytics, streaks, and activity patterns';
COMMENT ON COLUMN public.user_study_sessions.session_start IS 'When the study session started';
COMMENT ON COLUMN public.user_study_sessions.session_end IS 'When the session ended (NULL if still active)';
COMMENT ON COLUMN public.user_study_sessions.session_date IS 'Calendar date for the session (for daily aggregation)';
COMMENT ON COLUMN public.user_study_sessions.duration_seconds IS 'Total session duration in seconds';


-- ============================================================
-- MIGRATION 008: Consolidate to user_study_progress
-- ============================================================

-- Drop unused user_progress table (unit-based tracking, never populated)
DROP TABLE IF EXISTS public.user_progress CASCADE;

-- Ensure user_study_progress has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user ON public.user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_subject ON public.user_study_progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_note ON public.user_study_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_completed ON public.user_study_progress(user_id, subject_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_updated ON public.user_study_progress(updated_at);

-- Add updated_at trigger for user_study_progress
CREATE OR REPLACE FUNCTION public.touch_updated_at_progress()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_study_progress_touch ON public.user_study_progress;
CREATE TRIGGER trg_user_study_progress_touch
BEFORE UPDATE ON public.user_study_progress
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_progress();

-- Add comments for documentation
COMMENT ON TABLE public.user_study_progress IS 'Tracks user completion status for individual notes. Single source of truth for progress tracking.';
COMMENT ON COLUMN public.user_study_progress.is_completed IS 'Whether the user has marked this note as completed';
COMMENT ON COLUMN public.user_study_progress.total_time_spent IS 'Total seconds spent studying this note (future use)';
COMMENT ON COLUMN public.user_study_progress.last_study_date IS 'Last date user accessed this note (future use)';
COMMENT ON COLUMN public.user_study_progress.streak_count IS 'Study streak for this note (future use)';


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify user_study_sessions table exists
SELECT 'user_study_sessions created' AS status, COUNT(*) as row_count 
FROM public.user_study_sessions;

-- Verify user_progress is dropped
SELECT CASE 
  WHEN COUNT(*) = 0 THEN 'user_progress successfully dropped' 
  ELSE 'WARNING: user_progress still exists' 
END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_progress';

-- Verify user_study_progress indexes
SELECT 'Indexes on user_study_progress:' AS info;
SELECT indexname FROM pg_indexes 
WHERE tablename = 'user_study_progress' AND schemaname = 'public'
ORDER BY indexname;

-- Verify user_study_sessions indexes
SELECT 'Indexes on user_study_sessions:' AS info;
SELECT indexname FROM pg_indexes 
WHERE tablename = 'user_study_sessions' AND schemaname = 'public'
ORDER BY indexname;

-- Show current user_study_progress data
SELECT 'Current progress records:' AS info;
SELECT user_id, subject_id, note_id, is_completed, updated_at
FROM public.user_study_progress
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

SELECT '✅ All migrations applied successfully!' AS status;
SELECT '📊 user_study_sessions: Tracks study time and sessions' AS feature;
SELECT '✅ user_study_progress: Tracks note completion' AS feature;
SELECT '🗑️ user_progress: Removed (was unused)' AS feature;
