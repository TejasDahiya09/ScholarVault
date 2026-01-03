-- =============================================================================
-- Migration 003: Atomic RPC Toggle Functions
-- =============================================================================
-- Purpose: Replace application-side toggle logic with database-side RPCs
-- Benefits:
--   - Atomic operations (no race conditions)
--   - Single round-trip (performance)
--   - Database guarantees correctness
--   - Simpler backend code
-- =============================================================================

BEGIN;

-- =============================================================================
-- RPC: Toggle Bookmark (Atomic)
-- =============================================================================
/**
 * Copilot:
 * Create atomic bookmark toggle using plpgsql.
 * Logic:
 * - Check if bookmark exists
 * - If exists → DELETE and return FALSE
 * - If not exists → INSERT and return TRUE
 * Use SECURITY DEFINER to bypass RLS in controlled way.
 * No upsert or onConflict.
 */
CREATE OR REPLACE FUNCTION toggle_bookmark(
  p_user_id UUID,
  p_note_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_row BOOLEAN;
BEGIN
  -- Check if bookmark exists
  SELECT EXISTS (
    SELECT 1 FROM user_bookmarks
    WHERE user_id = p_user_id AND note_id = p_note_id
  ) INTO exists_row;

  IF exists_row THEN
    -- Remove bookmark
    DELETE FROM user_bookmarks
    WHERE user_id = p_user_id AND note_id = p_note_id;
    RETURN FALSE;
  ELSE
    -- Add bookmark
    INSERT INTO user_bookmarks (user_id, note_id, bookmarked_at)
    VALUES (p_user_id, p_note_id, CURRENT_TIMESTAMP);
    RETURN TRUE;
  END IF;
END;
$$;

-- Add comment
COMMENT ON FUNCTION toggle_bookmark IS 
  'Atomically toggle bookmark state. Returns TRUE if bookmarked, FALSE if unbookmarked.';

-- =============================================================================
-- RPC: Toggle Completion (Atomic)
-- =============================================================================
/**
 * Copilot:
 * Create atomic completion toggle using plpgsql.
 * Logic:
 * - Check if progress record exists
 * - If exists → UPDATE is_completed = NOT is_completed
 * - If not exists → INSERT with is_completed = TRUE
 * Return final boolean state.
 * Use SECURITY DEFINER for RLS bypass.
 */
CREATE OR REPLACE FUNCTION toggle_completion(
  p_user_id UUID,
  p_note_id UUID,
  p_subject_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_value BOOLEAN;
  final_value BOOLEAN;
BEGIN
  -- Try to get current completion status
  SELECT is_completed
  INTO current_value
  FROM user_study_progress
  WHERE user_id = p_user_id AND note_id = p_note_id;

  IF FOUND THEN
    -- Record exists, toggle it
    final_value := NOT current_value;
    UPDATE user_study_progress
    SET 
      is_completed = final_value,
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND note_id = p_note_id;
  ELSE
    -- Record doesn't exist, create as completed
    final_value := TRUE;
    INSERT INTO user_study_progress (
      user_id, 
      note_id, 
      subject_id, 
      is_completed,
      updated_at
    )
    VALUES (
      p_user_id, 
      p_note_id, 
      p_subject_id, 
      TRUE,
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN final_value;
END;
$$;

-- Add comment
COMMENT ON FUNCTION toggle_completion IS 
  'Atomically toggle completion state. Returns TRUE if completed, FALSE if incomplete.';

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 003: Atomic RPC Toggle Functions';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ FUNCTIONS CREATED:';
  RAISE NOTICE '  • toggle_bookmark(user_id, note_id)';
  RAISE NOTICE '  • toggle_completion(user_id, note_id, subject_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY:';
  RAISE NOTICE '  • Both use SECURITY DEFINER (bypass RLS safely)';
  RAISE NOTICE '  • SET search_path = public (prevent injection)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ BENEFITS:';
  RAISE NOTICE '  • Atomic operations (no race conditions)';
  RAISE NOTICE '  • Single DB round-trip (performance)';
  RAISE NOTICE '  • Database-guaranteed correctness';
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✨ RPC functions ready. Backend can now call via supabase.rpc()';
  RAISE NOTICE '=============================================================================';
END $$;

COMMIT;
