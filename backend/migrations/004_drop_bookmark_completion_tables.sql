-- ============================================================
-- PHASE 1: DROP BOOKMARK & COMPLETION TABLES
-- ============================================================
-- This migration completely removes the old bookmark and
-- completion tables to prepare for a clean rebuild.
--
-- RUN THIS MANUALLY IN SUPABASE SQL EDITOR
-- ============================================================

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS add_bookmark(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS remove_bookmark(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS set_note_completion(uuid, uuid, uuid, boolean) CASCADE;

-- Drop views that depend on tables
DROP VIEW IF EXISTS v_completed_notes CASCADE;

-- Drop the tables
DROP TABLE IF EXISTS user_bookmarks CASCADE;
DROP TABLE IF EXISTS user_study_progress CASCADE;

-- Keep user_study_sessions (analytics depends on it)
-- DO NOT DROP user_study_sessions

-- ============================================================
-- VERIFICATION: Run these queries to confirm deletion
-- ============================================================
-- SELECT * FROM user_bookmarks;  -- Should error: relation does not exist
-- SELECT * FROM user_study_progress;  -- Should error: relation does not exist
-- SELECT * FROM user_study_sessions;  -- Should still work
