-- ============================================================
-- ScholarVault Database Schema (CANONICAL SOURCE OF TRUTH)
-- ============================================================
-- This file defines the authoritative database rules for
-- ScholarVault.
--
--  All backend & frontend logic MUST follow this schema.
--  JavaScript must NOT re-implement database logic.
--
-- Last Updated: 2026-01-08
-- ============================================================


-- ============================================================
-- CORE INVARIANTS
-- ============================================================
-- 1. Database is the source of truth
-- 2. No toggle-by-read logic is allowed in JS
-- 3. Bookmarks and completion are idempotent
-- 4. Analytics are READ-ONLY from backend
-- 5. Frontend must never recompute analytics
-- ============================================================


-- ============================================================
-- UNIQUE CONSTRAINTS (CRITICAL)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_bookmarks_user_note_unique'
  ) THEN
    ALTER TABLE user_bookmarks
    ADD CONSTRAINT user_bookmarks_user_note_unique
    UNIQUE (user_id, note_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_study_progress_user_note_unique'
  ) THEN
    ALTER TABLE user_study_progress
    ADD CONSTRAINT user_study_progress_user_note_unique
    UNIQUE (user_id, note_id);
  END IF;
END $$;


-- ============================================================
-- FOREIGN KEYS
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookmarks_user'
  ) THEN
    ALTER TABLE user_bookmarks
    ADD CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookmarks_note'
  ) THEN
    ALTER TABLE user_bookmarks
    ADD CONSTRAINT fk_bookmarks_note
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_progress_user'
  ) THEN
    ALTER TABLE user_study_progress
    ADD CONSTRAINT fk_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_progress_note'
  ) THEN
    ALTER TABLE user_study_progress
    ADD CONSTRAINT fk_progress_note
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_progress_subject'
  ) THEN
    ALTER TABLE user_study_progress
    ADD CONSTRAINT fk_progress_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ============================================================
-- INDEXES (PERFORMANCE)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookmarks_user
ON user_bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_note
ON user_bookmarks(user_id, note_id);

CREATE INDEX IF NOT EXISTS idx_progress_user_completed
ON user_study_progress(user_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_progress_user_subject
ON user_study_progress(user_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date
ON user_study_sessions(user_id, session_date);

CREATE INDEX IF NOT EXISTS idx_sessions_user_start
ON user_study_sessions(user_id, session_start);


-- ============================================================
-- BOOKMARK FUNCTIONS (DETERMINISTIC)
-- ============================================================
--  Toggle logic in JS is FORBIDDEN
--  Use INSERT ... ON CONFLICT or DELETE only

CREATE OR REPLACE FUNCTION add_bookmark(
  p_user uuid,
  p_note uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_bookmarks (user_id, note_id, bookmarked_at)
  VALUES (p_user, p_note, now())
  ON CONFLICT (user_id, note_id)
  DO UPDATE SET bookmarked_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_bookmark(
  p_user uuid,
  p_note uuid
)
RETURNS void AS $$
BEGIN
  DELETE FROM user_bookmarks
  WHERE user_id = p_user AND note_id = p_note;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- COMPLETION FUNCTION (IDEMPOTENT)
-- ============================================================

CREATE OR REPLACE FUNCTION set_note_completion(
  p_user uuid,
  p_note uuid,
  p_subject uuid,
  p_completed boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_study_progress (
    user_id,
    note_id,
    subject_id,
    is_completed,
    updated_at
  )
  VALUES (
    p_user,
    p_note,
    p_subject,
    p_completed,
    now()
  )
  ON CONFLICT (user_id, note_id)
  DO UPDATE SET
    is_completed = EXCLUDED.is_completed,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- ANALYTICS VIEWS (READ-ONLY)
-- ============================================================

-- Completed notes
CREATE OR REPLACE VIEW v_completed_notes AS
SELECT user_id, subject_id, note_id
FROM user_study_progress
WHERE is_completed = true;

-- Total study time (hours)
CREATE OR REPLACE VIEW v_total_study_time AS
SELECT
  user_id,
  SUM(duration_seconds) / 3600.0 AS total_hours
FROM user_study_sessions
GROUP BY user_id;

-- Peak study hour
CREATE OR REPLACE VIEW v_peak_study_hour AS
SELECT
  user_id,
  EXTRACT(HOUR FROM session_start) AS hour,
  SUM(duration_seconds) AS total_seconds
FROM user_study_sessions
GROUP BY user_id, hour;


-- ============================================================
-- END OF CANONICAL SCHEMA
-- ============================================================
