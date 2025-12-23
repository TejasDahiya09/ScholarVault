-- Migration: Add user preferences columns
-- Date: 2025-12-23
-- Description: Adds study preferences columns to users table

-- Add selected_year column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS selected_year TEXT DEFAULT '1st Year';

-- Add study_goal column  
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS study_goal TEXT DEFAULT 'exam-prep';

-- Add notifications_enabled column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Add email_notifications column (for email notification preferences)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Add analytics_sharing column (for analytics sharing preferences)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS analytics_sharing BOOLEAN DEFAULT false;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index on selected_year for faster queries
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON public.users(selected_year);

-- Add comments for documentation
COMMENT ON COLUMN public.users.selected_year IS 'Academic year: 1st Year, 2nd Year, 3rd Year, or 4th Year';
COMMENT ON COLUMN public.users.study_goal IS 'Study preference: exam-prep, deep-learning, or revision';
COMMENT ON COLUMN public.users.notifications_enabled IS 'User preference for in-app notifications';
COMMENT ON COLUMN public.users.email_notifications IS 'User preference for email notifications';
COMMENT ON COLUMN public.users.analytics_sharing IS 'User consent for analytics data sharing';
