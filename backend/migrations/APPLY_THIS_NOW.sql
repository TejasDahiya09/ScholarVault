-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This script safely adds missing columns to the users table
-- It uses IF NOT EXISTS so it won't break if columns already exist

-- 1. Add study_goal column (if missing)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS study_goal TEXT DEFAULT 'exam-prep';

-- 2. Add notifications_enabled column (if missing)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- 3. Add updated_at column (if missing)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Ensure selected_year exists (should already be there)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS selected_year TEXT DEFAULT '1st Year';

-- 5. Ensure email_notifications exists (should already be there)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- 6. Ensure analytics_sharing exists (should already be there)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS analytics_sharing BOOLEAN DEFAULT false;

-- 7. Create index for faster queries on selected_year
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON public.users(selected_year);

-- 8. Create index for faster queries on study_goal
CREATE INDEX IF NOT EXISTS idx_users_study_goal ON public.users(study_goal);

-- 9. Add column documentation
COMMENT ON COLUMN public.users.selected_year IS 'Academic year: 1st Year, 2nd Year, 3rd Year, or 4th Year';
COMMENT ON COLUMN public.users.study_goal IS 'Study preference: exam-prep, deep-learning, or revision';
COMMENT ON COLUMN public.users.notifications_enabled IS 'User preference for in-app notifications';
COMMENT ON COLUMN public.users.email_notifications IS 'User preference for email notifications';
COMMENT ON COLUMN public.users.analytics_sharing IS 'User consent for analytics data sharing';
COMMENT ON COLUMN public.users.updated_at IS 'Last update timestamp for user record';

-- 10. Set updated_at for existing users (if they don't have it)
UPDATE public.users 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- ============================================
-- VERIFICATION QUERY
-- Run this after the migration to verify:
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'users'
-- ORDER BY ordinal_position;
