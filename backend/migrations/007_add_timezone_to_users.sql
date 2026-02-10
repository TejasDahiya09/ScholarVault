-- ============================================================
-- ADD TIMEZONE TO USERS FOR ANALYTICS & STREAK CORRECTNESS
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN public.users.timezone IS
'User IANA timezone (e.g., Asia/Kolkata, America/New_York). Used for progress analytics, streaks, and date boundaries.';
