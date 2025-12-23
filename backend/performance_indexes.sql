-- Performance indexes for ScholarVault database
-- Run these on your Supabase database to improve query performance

-- Subjects table indexes
CREATE INDEX IF NOT EXISTS idx_subjects_branch ON subjects(branch);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_branch_semester ON subjects(branch, semester);

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_branch ON notes(branch);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON notes(semester);
CREATE INDEX IF NOT EXISTS idx_notes_unit_number ON notes(unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_subject_unit ON notes(subject_id, unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON users(selected_year);

-- User progress table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_note_id ON user_study_progress(note_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_note ON user_study_progress(user_id, note_id);

-- User bookmarks table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_note_id ON user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_note ON user_bookmarks(user_id, note_id);

-- Search analytics indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);

-- Analyze tables for query optimization
ANALYZE subjects;
ANALYZE notes;
ANALYZE users;
ANALYZE user_study_progress;
ANALYZE user_bookmarks;
