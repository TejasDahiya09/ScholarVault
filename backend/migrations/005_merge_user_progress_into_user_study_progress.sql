-- Merge unit-level progress into user_study_progress
-- 1) Add missing columns to support unit tracking
ALTER TABLE public.user_study_progress
  ADD COLUMN IF NOT EXISTS unit_id int4 NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamp NULL;

-- 2) Backfill data from user_progress (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_progress'
  ) THEN
    INSERT INTO public.user_study_progress (user_id, unit_id, is_completed, completed_at, updated_at)
    SELECT user_id, unit_id, completed, completed_at, COALESCE(completed_at, NOW())
    FROM public.user_progress
    ON CONFLICT (user_id, unit_id) DO UPDATE
      SET is_completed = EXCLUDED.is_completed,
          completed_at = EXCLUDED.completed_at,
          updated_at = EXCLUDED.updated_at;

    -- Optional: Drop old table to avoid confusion
    -- Comment out if you prefer to keep for audit
    DROP TABLE IF EXISTS public.user_progress;
  END IF;
END $$;

-- 3) Ensure indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_unit 
ON public.user_study_progress(user_id, unit_id);

-- 4) Verify schema
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'user_study_progress' 
-- ORDER BY ordinal_position;
