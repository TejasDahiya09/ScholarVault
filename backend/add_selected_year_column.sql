-- Add selected_year column to users table
ALTER TABLE public.users 
ADD COLUMN selected_year TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.users.selected_year IS 'Academic year selection: 1st Year or 2nd Year';
