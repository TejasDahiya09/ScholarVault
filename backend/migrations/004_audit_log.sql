-- =============================================================================
-- Migration 004: Audit Log for Forensics & Analytics
-- =============================================================================
-- Purpose: Track all bookmark and completion changes
-- Benefits:
--   - Know who changed what and when
--   - Debug analytics mismatches
--   - Enable future features (history, undo, compliance)
--   - Forensics for support issues
-- =============================================================================

BEGIN;

-- =============================================================================
-- Audit Log Table
-- =============================================================================
/**
 * Copilot:
 * Create audit_log table to track user actions.
 * Columns:
 * - id: UUID primary key
 * - user_id: UUID (who performed action)
 * - entity_type: TEXT ('bookmark' | 'completion')
 * - entity_id: UUID (note_id that was affected)
 * - action: TEXT ('add' | 'remove' | 'complete' | 'uncomplete')
 * - created_at: TIMESTAMPTZ (when action occurred)
 * 
 * Enable RLS so users can only see their own audit logs.
 */
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('bookmark', 'completion')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'complete', 'uncomplete')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE public.audit_log IS 'Audit trail for bookmark and completion changes';
COMMENT ON COLUMN public.audit_log.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Type of entity: bookmark or completion';
COMMENT ON COLUMN public.audit_log.entity_id IS 'Note ID that was affected';
COMMENT ON COLUMN public.audit_log.action IS 'Action performed: add, remove, complete, uncomplete';
COMMENT ON COLUMN public.audit_log.metadata IS 'Additional context (subject_id, etc)';
COMMENT ON COLUMN public.audit_log.created_at IS 'Timestamp of action';

-- =============================================================================
-- Indexes for Performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id 
  ON public.audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON public.audit_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
  ON public.audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
  ON public.audit_log(user_id, created_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "audit_log_owner" ON public.audit_log;

-- Users can only see their own audit logs
CREATE POLICY "audit_log_owner"
ON public.audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Backend can insert via service role (no explicit INSERT policy needed)
-- Users cannot modify audit logs (immutable by design)

-- =============================================================================
-- Helper Function: Log Audit Event
-- =============================================================================
/**
 * Copilot:
 * Create helper function to log audit events.
 * This can be called from other functions or backend.
 * Parameters: user_id, entity_type, entity_id, action, metadata
 * Returns: void
 * Use SECURITY DEFINER to allow inserting via RPC.
 */
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (p_user_id, p_entity_type, p_entity_id, p_action, p_metadata);
END;
$$;

COMMENT ON FUNCTION log_audit_event IS 
  'Log an audit event. Called by backend after successful operations.';

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 004: Audit Log';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TABLE CREATED:';
  RAISE NOTICE '  • audit_log (with CHECK constraints)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 INDEXES CREATED:';
  RAISE NOTICE '  • idx_audit_log_user_id';
  RAISE NOTICE '  • idx_audit_log_entity';
  RAISE NOTICE '  • idx_audit_log_created_at';
  RAISE NOTICE '  • idx_audit_log_user_created';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS ENABLED:';
  RAISE NOTICE '  • Users can SELECT their own audit logs';
  RAISE NOTICE '  • Backend (service role) can INSERT';
  RAISE NOTICE '  • Audit logs are immutable';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ FUNCTION CREATED:';
  RAISE NOTICE '  • log_audit_event(user_id, type, id, action, metadata)';
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✨ Audit logging ready. Backend can now track all changes.';
  RAISE NOTICE '=============================================================================';
END $$;

COMMIT;
