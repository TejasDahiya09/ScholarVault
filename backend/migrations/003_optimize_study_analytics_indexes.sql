-- Migration: Add indexes for study session analytics performance
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_user_id ON user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_user_id_date ON user_study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_user_study_sessions_user_id_start ON user_study_sessions(user_id, session_start);
-- For progress analytics
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_id ON user_study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_id_note_id ON user_study_progress(user_id, note_id);
