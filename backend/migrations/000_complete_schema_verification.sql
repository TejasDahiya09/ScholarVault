-- ============================================================================
-- ScholarVault Complete Database Schema Verification & Creation Script
-- ============================================================================
-- This script verifies all required database structures exist and creates them if missing.
-- Safe to run multiple times (idempotent).
-- Last Updated: January 3, 2026
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

BEGIN;

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Core user accounts (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    selected_year TEXT DEFAULT '1st Year',
    email_notifications BOOLEAN DEFAULT true,
    analytics_sharing BOOLEAN DEFAULT true,
    study_goal TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON public.users(selected_year);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

COMMENT ON TABLE public.users IS 'User profiles and preferences';

-- ============================================================================
-- 2. SUBJECTS TABLE
-- ============================================================================
-- Academic subjects/courses
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch TEXT NOT NULL,
    semester TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    syllabus_text TEXT,
    syllabus_json JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_branch ON public.subjects(branch);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_semester ON public.subjects(branch, semester);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);

COMMENT ON TABLE public.subjects IS 'Academic subjects and courses';

-- ============================================================================
-- 3. NOTES TABLE
-- ============================================================================
-- Study notes and materials (PDFs, documents)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    branch TEXT NOT NULL,
    semester TEXT NOT NULL,
    subject TEXT NOT NULL,
    file_name TEXT NOT NULL,
    s3_url TEXT NOT NULL,
    s3_key TEXT,
    ocr_text TEXT,
    is_ocr_done BOOLEAN DEFAULT false,
    unit_number INT4,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_branch ON public.notes(branch);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON public.notes(semester);
CREATE INDEX IF NOT EXISTS idx_notes_unit_number ON public.notes(unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_subject_unit ON public.notes(subject_id, unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_is_ocr_done ON public.notes(is_ocr_done);

-- Full-text search index on OCR text
CREATE INDEX IF NOT EXISTS idx_notes_ocr_text_gin ON public.notes USING gin(to_tsvector('english', COALESCE(ocr_text, '')));

-- Trigram index for fuzzy search on file names
CREATE INDEX IF NOT EXISTS idx_notes_file_name_trgm ON public.notes USING gin(file_name gin_trgm_ops);

COMMENT ON TABLE public.notes IS 'Study notes and PDF documents';

-- ============================================================================
-- 4. BOOKS TABLE
-- ============================================================================
-- Reference books and textbooks
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    branch TEXT,
    semester TEXT,
    subject TEXT,
    file_name TEXT NOT NULL,
    s3_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Books indexes
CREATE INDEX IF NOT EXISTS idx_books_subject_id ON public.books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_branch ON public.books(branch);
CREATE INDEX IF NOT EXISTS idx_books_semester ON public.books(semester);

COMMENT ON TABLE public.books IS 'Reference books and textbooks';

-- ============================================================================
-- 5. USER_BOOKMARKS TABLE
-- ============================================================================
-- User's bookmarked notes for quick access
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_bookmark UNIQUE(user_id, note_id)
);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at ON public.user_bookmarks(bookmarked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created ON public.user_bookmarks(user_id, created_at DESC);

COMMENT ON TABLE public.user_bookmarks IS 'User bookmarked notes for quick access';

-- ============================================================================
-- 6. USER_STUDY_PROGRESS TABLE
-- ============================================================================
-- Track user's study progress per note
CREATE TABLE IF NOT EXISTS public.user_study_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    total_time_spent INT4 DEFAULT 0, -- in seconds
    last_study_date DATE,
    streak_count INT4 DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_progress UNIQUE(user_id, note_id)
);

-- Progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_note_id ON public.user_study_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_subject_id ON public.user_study_progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_note ON public.user_study_progress(user_id, note_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_subject ON public.user_study_progress(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_is_completed ON public.user_study_progress(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_study_date ON public.user_study_progress(user_id, last_study_date DESC);

COMMENT ON TABLE public.user_study_progress IS 'User study progress and completion tracking per note';

-- ============================================================================
-- 7. USER_STUDY_SESSIONS TABLE
-- ============================================================================
-- Track user's study sessions (login/logout times)
CREATE TABLE IF NOT EXISTS public.user_study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    session_date DATE NOT NULL,
    duration_seconds INT4,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_date ON public.user_study_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.user_study_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON public.user_study_sessions(created_at DESC);

COMMENT ON TABLE public.user_study_sessions IS 'User study sessions with start/end times';

-- ============================================================================
-- 8. SEARCH_ANALYTICS TABLE
-- ============================================================================
-- Track search queries for analytics
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    results_count INT4,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_subject_id ON public.search_analytics(subject_id);

COMMENT ON TABLE public.search_analytics IS 'Search query analytics and tracking';

-- ============================================================================
-- 9. UNIT_QUIZZES TABLE
-- ============================================================================
-- Quizzes for each unit
CREATE TABLE IF NOT EXISTS public.unit_quizzes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
    unit_number INT4,
    quiz_data JSONB NOT NULL, -- questions and answers
    raw_generated_text TEXT,
    is_unlocked BOOLEAN DEFAULT false,
    is_final_quiz BOOLEAN DEFAULT false,
    attempts INT4 DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    score INT4,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.unit_quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON public.unit_quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_note_id ON public.unit_quizzes(note_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_unit_number ON public.unit_quizzes(unit_number);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_subject ON public.unit_quizzes(user_id, subject_id);

COMMENT ON TABLE public.unit_quizzes IS 'Quizzes for learning units';

-- ============================================================================
-- 10. DOCUMENT_CHUNKS TABLE
-- ============================================================================
-- For vector embeddings and semantic search (future feature)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id BIGSERIAL PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(768) -- Requires pgvector extension if using vector search
);

-- Document chunks indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_note_id ON public.document_chunks(note_id);

COMMENT ON TABLE public.document_chunks IS 'Document chunks for vector embeddings and semantic search';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_study_progress table
DROP TRIGGER IF EXISTS update_progress_updated_at ON public.user_study_progress;
CREATE TRIGGER update_progress_updated_at
    BEFORE UPDATE ON public.user_study_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_study_sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.user_study_sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.user_study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate user's total study time
CREATE OR REPLACE FUNCTION get_user_total_study_time(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    total_seconds INT;
BEGIN
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO total_seconds
    FROM public.user_study_sessions
    WHERE user_id = p_user_id AND duration_seconds IS NOT NULL;
    
    RETURN total_seconds;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_total_study_time(UUID) IS 'Calculate total study time in seconds for a user';

-- Function to get user's current streak
CREATE OR REPLACE FUNCTION get_user_current_streak(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    current_streak INT := 0;
    check_date DATE := CURRENT_DATE;
    has_activity BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.user_study_sessions
            WHERE user_id = p_user_id 
            AND session_date = check_date
        ) INTO has_activity;
        
        IF NOT has_activity THEN
            EXIT;
        END IF;
        
        current_streak := current_streak + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN current_streak;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_current_streak(UUID) IS 'Calculate current study streak for a user';

-- Function to get subject completion percentage
CREATE OR REPLACE FUNCTION get_subject_completion_percentage(p_user_id UUID, p_subject_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_notes INT;
    completed_notes INT;
    percentage NUMERIC;
BEGIN
    -- Count total notes for the subject
    SELECT COUNT(*) INTO total_notes
    FROM public.notes
    WHERE subject_id = p_subject_id;
    
    IF total_notes = 0 THEN
        RETURN 0;
    END IF;
    
    -- Count completed notes
    SELECT COUNT(*) INTO completed_notes
    FROM public.user_study_progress
    WHERE user_id = p_user_id 
    AND subject_id = p_subject_id 
    AND is_completed = true;
    
    percentage := (completed_notes::NUMERIC / total_notes::NUMERIC) * 100;
    
    RETURN ROUND(percentage, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_subject_completion_percentage(UUID, UUID) IS 'Calculate completion percentage for a subject';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Note: Ensure RLS is enabled for sensitive tables

-- Enable RLS on user-specific tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_study_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role + user ownership access
DROP POLICY IF EXISTS users_own_data ON public.users;
CREATE POLICY users_own_data ON public.users
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.uid() = id)
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

DROP POLICY IF EXISTS bookmarks_own_data ON public.user_bookmarks;
CREATE POLICY bookmarks_own_data ON public.user_bookmarks
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS progress_own_data ON public.user_study_progress;
CREATE POLICY progress_own_data ON public.user_study_progress
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_own_data ON public.user_study_sessions;
CREATE POLICY sessions_own_data ON public.user_study_sessions
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.uid() = user_id)
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Public read access for subjects, notes, books (all students can view)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_public_read ON public.subjects;
CREATE POLICY subjects_public_read ON public.subjects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS notes_public_read ON public.notes;
CREATE POLICY notes_public_read ON public.notes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS books_public_read ON public.books;
CREATE POLICY books_public_read ON public.books
    FOR SELECT USING (true);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================
ANALYZE public.users;
ANALYZE public.subjects;
ANALYZE public.notes;
ANALYZE public.books;
ANALYZE public.user_bookmarks;
ANALYZE public.user_study_progress;
ANALYZE public.user_study_sessions;
ANALYZE public.search_analytics;
ANALYZE public.unit_quizzes;
ANALYZE public.document_chunks;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything was created successfully

DO $$
DECLARE
    table_count INT;
    index_count INT;
    function_count INT;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'subjects', 'notes', 'books', 
        'user_bookmarks', 'user_study_progress', 
        'user_study_sessions', 'search_analytics', 
        'unit_quizzes', 'document_chunks'
    );
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'update_updated_at_column',
        'get_user_total_study_time',
        'get_user_current_streak',
        'get_subject_completion_percentage'
    );
    
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ScholarVault Database Schema Verification Complete!';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Tables created: % / 10', table_count;
    RAISE NOTICE 'Indexes created: %+', index_count;
    RAISE NOTICE 'Functions created: % / 4', function_count;
    RAISE NOTICE '=======================================================';
    
    IF table_count = 10 AND function_count = 4 THEN
        RAISE NOTICE '✅ SUCCESS: All structures created successfully!';
    ELSE
        RAISE WARNING '⚠️ WARNING: Some structures may be missing. Please review output.';
    END IF;
    
    RAISE NOTICE '=======================================================';
END $$;

-- List all tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List all indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
