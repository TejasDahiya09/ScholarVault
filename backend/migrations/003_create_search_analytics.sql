-- Create search_analytics table for tracking search queries
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
