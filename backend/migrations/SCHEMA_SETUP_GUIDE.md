# 📋 Complete Database Schema Verification & Setup

## 🎯 Purpose

The `000_complete_schema_verification.sql` script will:
- ✅ Verify all required tables exist
- ✅ Create missing tables automatically
- ✅ Add all indexes for performance
- ✅ Create helper functions
- ✅ Set up triggers for auto-updates
- ✅ Configure Row Level Security (RLS)
- ✅ Provide verification report

**Safe to run multiple times!** (Idempotent)

---

## 🚀 How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy the entire contents of `000_complete_schema_verification.sql`
4. Paste into the editor
5. Click **Run**
6. Check the output for success messages

### Option 2: psql Command Line

```bash
cd backend/migrations
psql -U your_username -d your_database -f 000_complete_schema_verification.sql
```

### Option 3: Supabase CLI

```bash
supabase db push
```

---

## 📊 What Gets Created

### **Tables (10 total)**

1. **users** - User profiles and preferences
   - Extends auth.users with app-specific fields
   - Stores selected_year, preferences, etc.

2. **subjects** - Academic subjects/courses
   - Branch, semester, subject code, name
   - Syllabus text and JSON

3. **notes** - Study materials (PDFs)
   - Links to subjects
   - OCR text extracted
   - Unit numbers
   - S3 URLs

4. **books** - Reference textbooks
   - Links to subjects
   - S3 storage

5. **user_bookmarks** ⭐ **FOR BOOKMARK FEATURE**
   - User's saved notes
   - Quick access bookmarks

6. **user_study_progress** ✅ **FOR COMPLETION TRACKING**
   - Per-note completion status
   - Total time spent
   - Study dates and streaks

7. **user_study_sessions** - Session tracking
   - Login/logout times
   - Session durations
   - Daily study tracking

8. **search_analytics** - Search queries
   - Track what users search for
   - Analytics and insights

9. **unit_quizzes** - Quiz data
   - Generated quizzes per unit
   - Scores and attempts

10. **document_chunks** - Vector embeddings
    - For future semantic search
    - Document chunking

### **Indexes (40+ total)**

Performance indexes on:
- All foreign keys
- Frequently queried columns
- Date/timestamp columns
- Text search columns (GIN indexes)
- Composite indexes for common queries

### **Functions (4 total)**

1. `update_updated_at_column()` - Auto-update timestamps
2. `get_user_total_study_time(user_id)` - Calculate total study time
3. `get_user_current_streak(user_id)` - Calculate study streak
4. `get_subject_completion_percentage(user_id, subject_id)` - Get completion %

### **Triggers (3 total)**

Auto-update `updated_at` columns on:
- users table
- user_study_progress table
- user_study_sessions table

### **Row Level Security (RLS)**

Policies to ensure:
- Users only see their own data (bookmarks, progress, sessions)
- All users can read subjects, notes, books
- Secure by default

---

## ✅ Verification

The script automatically runs verification at the end and shows:

```
=======================================================
ScholarVault Database Schema Verification Complete!
=======================================================
Tables created: 10 / 10
Indexes created: 45+
Functions created: 4 / 4
=======================================================
✅ SUCCESS: All structures created successfully!
=======================================================
```

### Manual Verification

Check tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Check indexes:
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Check functions:
```sql
SELECT proname 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```

---

## 🔍 After Running

### Test the Functions

```sql
-- Get total study time for a user
SELECT get_user_total_study_time('your-user-uuid');

-- Get current streak
SELECT get_user_current_streak('your-user-uuid');

-- Get subject completion percentage
SELECT get_subject_completion_percentage('your-user-uuid', 'subject-uuid');
```

### Verify Bookmarks Table

```sql
-- Check structure
\d user_bookmarks

-- Test insert (replace with real UUIDs)
INSERT INTO user_bookmarks (user_id, note_id)
VALUES ('your-user-uuid', 'note-uuid');

-- Verify
SELECT * FROM user_bookmarks;
```

### Verify Progress Table

```sql
-- Check structure
\d user_study_progress

-- Test insert
INSERT INTO user_study_progress (user_id, note_id, subject_id, is_completed)
VALUES ('your-user-uuid', 'note-uuid', 'subject-uuid', true);

-- Verify
SELECT * FROM user_study_progress;
```

---

## 🐛 Troubleshooting

### Issue: Permission denied

**Solution:** Run as superuser or ensure you have CREATE privileges
```sql
GRANT CREATE ON SCHEMA public TO your_username;
```

### Issue: Extension not found

**Solution:** Install required extensions first
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Issue: Foreign key constraint fails

**Solution:** Ensure referenced tables exist (auth.users should exist in Supabase)

### Issue: RLS blocking queries

**Solution:** Disable RLS temporarily for testing
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

Or set proper JWT context in API calls.

---

## 📝 Notes

- **UUID Types**: All IDs use UUID (not integers)
- **Timestamps**: All use TIMESTAMPTZ (timezone-aware)
- **Soft Deletes**: Tables use CASCADE on foreign keys
- **Performance**: All indexes are created for optimal query speed
- **Security**: RLS enabled by default on user-specific tables

---

## 🎉 Next Steps

After running this script:

1. ✅ All database structures are ready
2. ✅ Restart your backend server
3. ✅ Test bookmark feature in app
4. ✅ Test mark as completed feature
5. ✅ Monitor performance with indexes

---

## 🔗 Related Files

- [create_bookmarks_table.sql](create_bookmarks_table.sql) - Standalone bookmarks table
- [BOOKMARK_FIX_README.md](../../BOOKMARK_FIX_README.md) - Bookmark feature docs
- [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md) - Deployment guide

---

**Last Updated:** January 3, 2026  
**Script Version:** 1.0  
**Status:** Production Ready ✅
