# ⚠️ IMPORTANT: Create user_bookmarks Table

## The `user_bookmarks` table is MISSING from your database!

Based on your current schema, I can see you have:
- ✅ `user_study_progress` (for completion tracking)
- ✅ `user_study_sessions` (for session tracking)
- ❌ `user_bookmarks` (MISSING - needed for bookmark feature)

## 🚀 Create the Table Now

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_bookmark UNIQUE(user_id, note_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_bookmarked_at ON public.user_bookmarks(bookmarked_at DESC);

COMMENT ON TABLE public.user_bookmarks IS 'Stores user bookmarked notes for quick access';
```

4. Click **Run**
5. You should see: ✅ Success

### Option 2: psql Command Line

```bash
cd backend/migrations
psql -U your_user -d your_database -f create_bookmarks_table.sql
```

### Option 3: Supabase CLI

```bash
supabase db push
```

## ✅ Verify Table Created

Run this in SQL Editor:

```sql
SELECT * FROM public.user_bookmarks LIMIT 1;
```

If it returns empty (no error), the table exists! ✅

## 🔍 Your Current Schema

Based on your database, here's what each table uses for IDs:

| Table | Primary Key | user_id | note_id |
|-------|-------------|---------|---------|
| users | UUID | - | - |
| notes | UUID | - | - |
| user_study_progress | int8 | UUID | UUID |
| user_study_sessions | UUID | UUID | UUID |
| **user_bookmarks** | **UUID** | **UUID** | **UUID** |

## ⚙️ Code Already Updated

The backend code is already configured to work with UUID types - Supabase handles this automatically. Just create the table and restart your backend!

## 🚨 After Creating Table

```bash
# Restart backend
cd backend
npm start
```

Then test in your app - bookmarks will work! 🎉
