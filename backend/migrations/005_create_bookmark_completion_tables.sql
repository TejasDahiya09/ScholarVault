-- ============================================================
-- ScholarVault Database Schema (PHASE 2: Clean Rebuild)
-- ============================================================
-- CANONICAL SOURCE OF TRUTH
-- All backend & frontend logic MUST follow this schema.
--
-- DESIGN PRINCIPLES:
-- 1. Presence = truth (no boolean flags)
-- 2. UNIQUE constraints prevent duplicates
-- 3. No toggle-by-read logic in JS
-- 4. Explicit INSERT/DELETE only
-- ============================================================

-- ============================================================
-- BOOKMARKS TABLE
-- ============================================================
-- Row exists = bookmarked
-- Row deleted = not bookmarked
-- No boolean field needed

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, note_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_note ON user_bookmarks(user_id, note_id);


-- ============================================================
-- NOTE COMPLETIONS TABLE
-- ============================================================
-- Row exists = completed
-- Row deleted = not completed
-- No boolean field needed

CREATE TABLE IF NOT EXISTS user_note_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (user_id, note_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_completions_user_id ON user_note_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_note ON user_note_completions(user_id, note_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_subject ON user_note_completions(user_id, subject_id);


-- ============================================================
-- STUDY SESSIONS TABLE (EXISTING - DO NOT MODIFY)
-- ============================================================
-- This table already exists and tracks study time
-- Keeping it unchanged for analytics


-- ============================================================
-- INVARIANTS (ENFORCED BY SCHEMA)
-- ============================================================
-- 1. A user can only bookmark a note once (UNIQUE constraint)
-- 2. A user can only complete a note once (UNIQUE constraint)
-- 3. Deleting a user cascades to their bookmarks/completions
-- 4. Deleting a note cascades to its bookmarks/completions
-- 5. Deleting a subject cascades to its completions


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these after creating tables:
--
-- SELECT * FROM user_bookmarks LIMIT 1;
-- SELECT * FROM user_note_completions LIMIT 1;
--
-- Both should return empty results (no rows) but no errors.
