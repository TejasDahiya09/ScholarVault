-- Migration: Consolidate progress tracking to user_study_progress
-- Date: 2025-12-23
-- Description: Drop unused user_progress table since we use note-level tracking exclusively

-- Drop user_progress table (unit-based tracking, unused)
-- We use user_study_progress for note-level completion tracking instead
DROP TABLE IF EXISTS public.user_progress CASCADE;

-- Ensure user_study_progress has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user ON public.user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_subject ON public.user_study_progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_note ON public.user_study_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_completed ON public.user_study_progress(user_id, subject_id, is_completed);

-- Add updated_at trigger if not exists
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

-- Comments for documentation
COMMENT ON TABLE public.user_study_progress IS 'Tracks user completion status for individual notes. Use this for all progress tracking.';
COMMENT ON COLUMN public.user_study_progress.is_completed IS 'Whether the user has marked this note as completed';
COMMENT ON COLUMN public.user_study_progress.total_time_spent IS 'Total seconds spent studying this note (future use)';
COMMENT ON COLUMN public.user_study_progress.last_study_date IS 'Last date user accessed this note (future use)';
COMMENT ON COLUMN public.user_study_progress.streak_count IS 'Study streak for this note (future use)';
