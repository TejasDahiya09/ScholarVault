# 🔧 Complete Database Schema Sync Guide

## What This Script Does

This is a **comprehensive migration** that ensures your database schema matches **everything** your application code expects. It:

✅ Adds missing columns to existing tables
✅ Creates missing tables
✅ Creates all indexes for performance
✅ Sets up foreign key constraints
✅ Creates functions and triggers
✅ Updates existing data with safe defaults
✅ **100% idempotent** - safe to run multiple times

---

## 📋 Tables Covered

### Core Tables
1. **users** - User accounts with preferences
2. **subjects** - Academic subjects/courses
3. **notes** - Study notes and PDFs
4. **books** - Reference books

### Progress Tracking
5. **user_bookmarks** - Bookmarked notes
6. **user_progress** - Unit completion tracking
7. **user_study_progress** - Detailed note-level progress

### Analytics & Features
8. **search_analytics** - Search query tracking
9. **unit_quizzes** - Quiz/assessment data
10. **document_chunks** - Vector embeddings for AI search

---

## 🚀 How to Apply

### Step 1: Backup (Recommended)
Before running any migration, take a backup:
1. Go to Supabase Dashboard → Database → Backups
2. Click "Create backup" or verify automatic backups are enabled

### Step 2: Run the Migration
1. Go to https://supabase.com/dashboard
2. Select your ScholarVault project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy entire contents of `COMPLETE_SCHEMA_SYNC.sql`
6. Paste into SQL editor
7. Click **Run** ▶️

### Step 3: Verify Success
You should see:
```
✅ Migration completed successfully! All tables, columns, indexes, and functions are now in sync with the application code.
```

---

## 📊 What Gets Added/Fixed

### Users Table
- ✅ `selected_year` (TEXT) - Academic year selection
- ✅ `study_goal` (TEXT) - Learning preference
- ✅ `notifications_enabled` (BOOLEAN) - In-app notifications
- ✅ `email_notifications` (BOOLEAN) - Email notifications
- ✅ `analytics_sharing` (BOOLEAN) - Data sharing consent
- ✅ `updated_at` (TIMESTAMP) - Last modified timestamp
- ✅ Indexes on email, selected_year, study_goal

### Subjects Table
- ✅ `code` (TEXT) - Subject code
- ✅ `syllabus_text` (TEXT) - Plain text syllabus
- ✅ `syllabus_json` (JSONB) - Structured syllabus data
- ✅ `description` (TEXT) - Subject description
- ✅ Indexes on branch, semester, code

### Notes Table
- ✅ `file_name` (TEXT) - Original filename
- ✅ `subject_id` (UUID) - Subject reference
- ✅ `unit_number` (INTEGER) - Unit/chapter number
- ✅ `s3_url` (TEXT) - File storage URL
- ✅ `ocr_text` (TEXT) - Extracted text content
- ✅ `is_ocr_done` (BOOLEAN) - OCR completion flag
- ✅ Indexes on subject_id, branch, semester, unit_number
- ✅ Full-text search index on ocr_text

### Books Table (Created if Missing)
- ✅ All required columns
- ✅ Foreign key to subjects
- ✅ Performance indexes

### User Bookmarks Table (Created if Missing)
- ✅ user_id, note_id references
- ✅ Unique constraint (user_id, note_id)
- ✅ Cascade delete on user/note deletion

### User Progress Tables (Created if Missing)
- ✅ `user_progress` - Unit-level tracking
- ✅ `user_study_progress` - Note-level tracking
- ✅ All indexes for fast queries

### Search Analytics (Created if Missing)
- ✅ Tracks search queries
- ✅ Links to users and subjects
- ✅ Indexes for analytics queries

### Quiz System (Created if Missing)
- ✅ `unit_quizzes` table
- ✅ Stores quiz data as JSONB
- ✅ Tracks attempts, scores, pass/fail

### AI Features (Created if Missing)
- ✅ `document_chunks` table
- ✅ Vector embeddings support
- ✅ Foreign keys to notes

---

## 🔧 Functions & Triggers Created

### Auto-Update Timestamp Function
Automatically updates `updated_at` column when records change:
- Applied to: `users` table
- Applied to: `user_study_progress` table

### Foreign Key Constraints
Ensures data integrity:
- notes.subject_id → subjects.id
- books.subject_id → subjects.id
- All user-related tables → users.id

---

## ✅ Safety Features

### Idempotent Design
- Uses `IF NOT EXISTS` for all objects
- Safe to run multiple times
- Won't duplicate data or fail on re-runs

### Data Preservation
- Never drops columns or tables
- Only adds missing schema elements
- Sets safe defaults for existing rows

### Automatic Cleanup
- Sets `updated_at` for existing users
- Sets default `study_goal` for existing users
- Sets default notifications for existing users

---

## 🧪 Verification Queries

After running the migration, verify everything:

### Check Users Table Columns
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Check All Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Check All Indexes
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Check Foreign Keys
```sql
SELECT conname, conrelid::regclass AS table_name 
FROM pg_constraint 
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
```

---

## 📈 Performance Improvements

The migration creates **strategic indexes** for:

### User Queries
- Email lookups (login)
- Year-based filtering
- Study goal filtering

### Subject Queries
- Branch + semester filtering
- Subject code lookups

### Notes Queries
- Subject-based filtering
- Unit number sorting
- OCR full-text search
- Branch/semester filtering

### Progress Tracking
- User progress lookups
- Completion status checks
- Subject completion queries

### Analytics
- Search history queries
- User activity tracking
- Time-based reports

---

## 🐛 Troubleshooting

### "Permission denied" error
- Ensure you're logged in as project owner
- Check database connection settings

### "Column already exists" warnings
- This is normal! Script checks before adding
- No action needed if data is preserved

### Foreign key constraint errors
- Check if referenced tables (subjects, users, notes) exist
- Verify no orphaned records (e.g., notes without subjects)

### Extension not found (uuid_generate_v4)
The script assumes `extensions.uuid_generate_v4()` is available. If not:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 📝 What Each Feature Does

### Study Goal (`study_goal`)
- `'exam-prep'` - Focus on exam preparation
- `'deep-learning'` - Thorough conceptual understanding
- `'revision'` - Quick review and summaries

### Notifications
- `notifications_enabled` - In-app alerts
- `email_notifications` - Email alerts (future)

### Progress Tracking
- `user_progress` - Overall unit completion
- `user_study_progress` - Individual note completion
- Supports streak tracking, time spent

### Search Analytics
- Tracks what users search for
- Links searches to subjects
- Powers recommendation system

### Quiz System
- Generates quizzes per unit
- Tracks attempts and scores
- Unlocks final quiz after unit completion

---

## ✅ Post-Migration Checklist

After running the migration:

- [ ] Migration completed without errors
- [ ] Verification queries return expected results
- [ ] Existing users can still login
- [ ] Onboarding flow works (no JSON error)
- [ ] Bookmarks still accessible
- [ ] Progress tracking works
- [ ] Search functionality intact
- [ ] No console errors in browser
- [ ] Backend logs show no errors
- [ ] App loads without 500 errors

---

## 🎯 Next Steps

Once migration is complete:

1. **Test the App**
   - Login/register works
   - Onboarding saves preferences
   - Dashboard loads correctly
   - Search works
   - Bookmarks work

2. **Monitor Performance**
   - Check query speeds in Supabase logs
   - Verify indexes are being used
   - Monitor cache hit rates

3. **Deploy Backend**
   - Render will auto-deploy from GitHub
   - Backend code already updated
   - No backend changes needed

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs for SQL errors
2. Run verification queries above
3. Check browser console for frontend errors
4. Check Render logs for backend errors
5. Verify environment variables are set

---

**🎉 Once complete, your database will be 100% in sync with your application code!**
