-- Fix user_bookmarks foreign key constraint
-- The constraint was incorrectly referencing auth.users instead of public.users

-- Drop the incorrect foreign key constraint
ALTER TABLE public.user_bookmarks
DROP CONSTRAINT IF EXISTS fk_user_bookmarks_user_id;

-- Add the correct foreign key constraint
ALTER TABLE public.user_bookmarks
ADD CONSTRAINT fk_user_bookmarks_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
