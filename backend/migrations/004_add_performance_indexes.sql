-- Performance optimization: Add indexes for frequently queried/filtered columns
-- This migration ensures O(log n) lookups instead of full table scans

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_selected_year ON users(selected_year);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_unit_number ON notes(unit_number);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_branch ON notes(branch);
CREATE INDEX IF NOT EXISTS idx_notes_semester ON notes(semester);

-- Subjects table indexes
CREATE INDEX IF NOT EXISTS idx_subjects_branch ON subjects(branch);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- Books table indexes
CREATE INDEX IF NOT EXISTS idx_books_subject_id ON books(subject_id);
CREATE INDEX IF NOT EXISTS idx_books_type ON books(type);
CREATE INDEX IF NOT EXISTS idx_books_branch ON books(branch);

-- PYQs table indexes
CREATE INDEX IF NOT EXISTS idx_pyqs_subject_id ON pyqs(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyqs_branch ON pyqs(branch);
CREATE INDEX IF NOT EXISTS idx_pyqs_semester ON pyqs(semester);

-- Bookmarks table indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_note_id ON bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_composite ON bookmarks(user_id, note_id);

-- Progress table indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_subject_id ON progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_progress_composite ON progress(user_id, subject_id);

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
