-- ============================================
-- COMPREHENSIVE SCHEMA MIGRATION
-- ============================================
-- This script ensures ALL tables, columns, indexes, and functions
-- required by the ScholarVault application are present
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS selected_year TEXT DEFAULT '1st Year';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS study_goal TEXT DEFAULT 'exam-prep';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS analytics_sharing BOOLEAN DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON public.users(selected_year);
CREATE INDEX IF NOT EXISTS idx_users_study_goal ON public.users(study_goal);

-- ============================================
-- 2. SUBJECTS TABLE
-- ============================================
-- Ensure all required columns exist
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS code TEXT;

ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS syllabus_text TEXT;

ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS syllabus_json JSONB;

ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_branch ON public.subjects(branch);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects(code);

-- ============================================
-- 3. NOTES TABLE
-- ============================================
-- Ensure all required columns exist
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS subject_id UUID;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS unit_number INTEGER;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS semester TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS branch TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS s3_url TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS ocr_text TEXT;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS is_ocr_done BOOLEAN DEFAULT false;

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_branch ON public.notes(branch);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON public.notes(semester);
CREATE INDEX IF NOT EXISTS idx_notes_unit_number ON public.notes(unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_is_ocr_done ON public.notes(is_ocr_done);

-- Full-text search index for OCR text
CREATE INDEX IF NOT EXISTS idx_notes_ocr_text_search ON public.notes USING gin(to_tsvector('english', COALESCE(ocr_text, '')));

-- ============================================
-- 4. BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    file_name TEXT,
    branch TEXT,
    semester TEXT,
    subject TEXT,
    s3_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Books indexes
CREATE INDEX IF NOT EXISTS idx_books_subject_id ON public.books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_branch ON public.books(branch);
CREATE INDEX IF NOT EXISTS idx_books_semester ON public.books(semester);

-- ============================================
-- 5. USER_BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    bookmarked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, note_id)
);

-- User bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_created ON public.user_bookmarks(bookmarked_at DESC);

-- ============================================
-- 6. USER_PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    unit_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    UNIQUE(user_id, unit_id)
);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON public.user_progress(completed);

-- ============================================
-- 7. USER_STUDY_PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_study_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    total_time_spent INTEGER DEFAULT 0,
    last_study_date DATE,
    streak_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User study progress indexes
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_id ON public.user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_subject_id ON public.user_study_progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_note_id ON public.user_study_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_completed ON public.user_study_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_subject ON public.user_study_progress(user_id, subject_id);

-- ============================================
-- 8. SEARCH_ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_subject_id ON public.search_analytics(subject_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);

-- ============================================
-- 9. UNIT_QUIZZES TABLE (if using quizzes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.unit_quizzes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    unit_number INTEGER,
    quiz_data JSONB,
    raw_generated_text TEXT,
    is_unlocked BOOLEAN DEFAULT false,
    is_final_quiz BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    score INTEGER,
    is_passed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Unit quizzes indexes
CREATE INDEX IF NOT EXISTS idx_unit_quizzes_user_id ON public.unit_quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_quizzes_subject_id ON public.unit_quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_unit_quizzes_unit_number ON public.unit_quizzes(unit_number);
CREATE INDEX IF NOT EXISTS idx_unit_quizzes_is_unlocked ON public.unit_quizzes(is_unlocked);

-- ============================================
-- 10. DOCUMENT_CHUNKS TABLE (for vector search)
-- ============================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
    embedding VECTOR(768),
    position INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks indexes
CREATE INDEX IF NOT EXISTS idx_document_chunks_note_id ON public.document_chunks(note_id);

-- ============================================
-- 11. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to user_study_progress table
DROP TRIGGER IF EXISTS update_user_study_progress_updated_at ON public.user_study_progress;
CREATE TRIGGER update_user_study_progress_updated_at 
    BEFORE UPDATE ON public.user_study_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. FOREIGN KEY CONSTRAINTS (if missing)
-- ============================================

-- Add foreign key for notes.subject_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notes_subject_id_fkey'
    ) THEN
        ALTER TABLE public.notes 
        ADD CONSTRAINT notes_subject_id_fkey 
        FOREIGN KEY (subject_id) 
        REFERENCES public.subjects(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for books.subject_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'books_subject_id_fkey'
    ) THEN
        ALTER TABLE public.books 
        ADD CONSTRAINT books_subject_id_fkey 
        FOREIGN KEY (subject_id) 
        REFERENCES public.subjects(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- 13. UPDATE EXISTING DATA
-- ============================================

-- Set updated_at for existing users
UPDATE public.users 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Set default study_goal for existing users
UPDATE public.users 
SET study_goal = 'exam-prep' 
WHERE study_goal IS NULL;

-- Set default notifications for existing users
UPDATE public.users 
SET notifications_enabled = true 
WHERE notifications_enabled IS NULL;

-- ============================================
-- 14. COLUMN COMMENTS (Documentation)
-- ============================================

COMMENT ON COLUMN public.users.selected_year IS 'Academic year: 1st Year, 2nd Year, 3rd Year, or 4th Year';
COMMENT ON COLUMN public.users.study_goal IS 'Study preference: exam-prep, deep-learning, or revision';
COMMENT ON COLUMN public.users.notifications_enabled IS 'User preference for in-app notifications';
COMMENT ON COLUMN public.users.email_notifications IS 'User preference for email notifications';
COMMENT ON COLUMN public.users.analytics_sharing IS 'User consent for analytics data sharing';
COMMENT ON COLUMN public.users.updated_at IS 'Last update timestamp for user record';

COMMENT ON COLUMN public.notes.ocr_text IS 'Extracted text from PDF/image using OCR';
COMMENT ON COLUMN public.notes.is_ocr_done IS 'Flag indicating if OCR processing is complete';

COMMENT ON TABLE public.user_bookmarks IS 'Stores user-bookmarked notes for quick access';
COMMENT ON TABLE public.user_progress IS 'Tracks user progress through units';
COMMENT ON TABLE public.user_study_progress IS 'Detailed study progress tracking per note';
COMMENT ON TABLE public.search_analytics IS 'Analytics data for search queries';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify everything is set up:
-- 
-- 1. Check users table columns:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND table_schema = 'public'
-- ORDER BY ordinal_position;
--
-- 2. Check all tables exist:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
--
-- 3. Check all indexes:
-- SELECT tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;
--
-- 4. Check all foreign keys:
-- SELECT conname, conrelid::regclass AS table_name 
-- FROM pg_constraint 
-- WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
--
-- ============================================

-- Migration complete!
SELECT 'Migration completed successfully! All tables, columns, indexes, and functions are now in sync with the application code.' AS status;
