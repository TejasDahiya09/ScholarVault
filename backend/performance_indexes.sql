-- ===== SCHOLARVAULT PERFORMANCE INDEXES =====
-- Purpose: Optimize frequent database queries
-- Impact: Dramatically reduces query times (from seconds to milliseconds)
-- Run these on your Supabase database

-- ===== NOTES TABLE INDEXES =====
-- Most accessed table - needs comprehensive indexing

-- Index for subject-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_notes_subject_id 
ON notes(subject_id);

-- Index for subject + unit queries (search/filter)
CREATE INDEX IF NOT EXISTS idx_notes_subject_unit 
ON notes(subject_id, unit_number);

-- Index for semester filtering
CREATE INDEX IF NOT EXISTS idx_notes_semester 
ON notes(semester);

-- Index for branch filtering
CREATE INDEX IF NOT EXISTS idx_notes_branch 
ON notes(branch);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_notes_filters 
ON notes(subject_id, semester, branch, unit_number);

-- Index for date ordering (recent notes first)
CREATE INDEX IF NOT EXISTS idx_notes_created 
ON notes(created_at DESC);

-- Full-text search on file names (if not already exists)
CREATE INDEX IF NOT EXISTS idx_notes_filename_search 
ON notes USING gin(to_tsvector('english', file_name));

-- Full-text search on OCR text (for advanced search)
CREATE INDEX IF NOT EXISTS idx_notes_ocr_search 
ON notes USING gin(to_tsvector('english', ocr_text));

-- ===== SUBJECTS TABLE INDEXES =====
-- Subjects are frequently joined with notes

-- Index for branch filtering
CREATE INDEX IF NOT EXISTS idx_subjects_branch 
ON subjects(branch);

-- Index for semester filtering
CREATE INDEX IF NOT EXISTS idx_subjects_semester 
ON subjects(semester);

-- Composite index for common subject queries
CREATE INDEX IF NOT EXISTS idx_subjects_filters 
ON subjects(branch, semester);

-- ===== SEARCH ANALYTICS TABLE INDEXES =====
-- For analytics queries and trending searches

-- Index for query lookup
CREATE INDEX IF NOT EXISTS idx_search_analytics_query 
ON search_analytics(query);

-- Index for timestamp (trending/recent searches)
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp 
ON search_analytics(timestamp DESC);

-- Composite index for query popularity analysis
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_timestamp 
ON search_analytics(query, timestamp DESC);

-- ===== USER PROGRESS TABLE INDEXES =====
-- For progress tracking and completion status

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id 
ON user_progress(user_id);

-- Index for user + subject queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_subject 
ON user_progress(user_id, subject_id);

-- Index for user + note queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_note 
ON user_progress(user_id, note_id);

-- ===== USER BOOKMARKS TABLE INDEXES =====
-- For bookmark lookups

-- Index for user-based bookmark queries
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id 
ON user_bookmarks(user_id);

-- Index for note-based queries
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id 
ON user_bookmarks(note_id);

-- Composite index for bookmark checks
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_note 
ON user_bookmarks(user_id, note_id);

-- ===== VERIFY INDEXES =====
-- Run this to see all indexes
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- ===== INDEX STATISTICS =====
-- Run this to see index usage statistics
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
