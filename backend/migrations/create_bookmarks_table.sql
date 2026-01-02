-- Create user_bookmarks table for ScholarVault
-- This stores which notes users have bookmarked
-- Uses UUID types to match your existing schema

CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_bookmark UNIQUE(user_id, note_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at ON public.user_bookmarks(bookmarked_at DESC);

-- Add comment
COMMENT ON TABLE public.user_bookmarks IS 'Stores user bookmarked notes for quick access';

-- Verify the table was created
SELECT 'user_bookmarks table created successfully!' as status;
