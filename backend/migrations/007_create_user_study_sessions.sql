-- Migration: Create user_study_sessions table
-- Date: 2025-12-23

CREATE TABLE IF NOT EXISTS public.user_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ NULL,
  session_date DATE NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.user_study_sessions(session_date);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_touch ON public.user_study_sessions;
CREATE TRIGGER trg_sessions_touch
BEFORE UPDATE ON public.user_study_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
