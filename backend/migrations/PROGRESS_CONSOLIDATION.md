# Database Migration: Consolidate Progress Tables

## Overview
This migration consolidates progress tracking to use **`user_study_progress`** exclusively and drops the unused **`user_progress`** table.

## Changes

### Tables Affected
- **DROPPED**: `user_progress` (unit-based tracking, unused)
- **KEPT**: `user_study_progress` (note-level tracking, actively used)

### Why?
- The app tracks completion at the **note level**, not unit level
- `user_study_progress` is the active table with all user completion data
- `user_progress` was never populated and is redundant
- Consolidation simplifies the schema and reduces confusion

## What `user_study_progress` Tracks
- **Note completion**: `is_completed` (used in Dashboard, Progress, Subjects)
- **Future fields**: `total_time_spent`, `last_study_date`, `streak_count` (reserved for per-note analytics)

## How to Apply

### Run the migration SQL
```sql
-- Apply migration 008
\i backend/migrations/008_consolidate_progress_tables.sql
```

Or in Supabase SQL Editor:
```sql
-- Copy and paste contents of 008_consolidate_progress_tables.sql
```

## Code Changes
- **Backend**: Updated `backend/src/db/progress.js` to remove `user_progress` functions
- **Routes**: All progress endpoints now use `user_study_progress` exclusively
- **No frontend changes needed**: Frontend already uses note-level completion

## Verification
After migration, verify:
```sql
-- Check user_progress is dropped
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_progress';
-- Should return 0 rows

-- Check user_study_progress structure
\d public.user_study_progress

-- Check indexes
\di public.idx_user_study_progress*
```

## Rollback (if needed)
```sql
-- Recreate user_progress (but it will be empty)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  unit_id INT4 NOT NULL,
  completed BOOL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Impact
- **No data loss**: `user_progress` was already empty
- **Performance improvement**: Fewer tables to maintain, better-indexed queries
- **Code clarity**: Single source of truth for progress tracking
