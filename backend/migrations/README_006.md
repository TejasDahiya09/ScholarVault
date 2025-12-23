# How to Apply Database Migration for User Preferences

## Issue Fixed
The onboarding modal was failing with error: "Failed to update user: Cannot coerce the result to a single JSON object"

This happened because the database was missing columns for user preferences:
- `study_goal` (exam-prep, deep-learning, revision)
- `notifications_enabled` (boolean for in-app notifications)
- `selected_year` (already partially working but needs to be added if missing)
- `email_notifications` (boolean for email notifications)
- `analytics_sharing` (boolean for analytics consent)

## How to Apply the Migration

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your ScholarVault project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `006_add_user_preferences_columns.sql`
6. Paste it into the SQL editor
7. Click **Run** to execute the migration
8. Verify the columns were added by going to **Table Editor** → **users** table

### Option 2: Using psql Command Line

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i backend/migrations/006_add_user_preferences_columns.sql

# Verify columns were added
\d public.users
```

### Option 3: Using DBeaver or Other Database Tools

1. Connect to your Supabase PostgreSQL database
2. Open a SQL console
3. Copy and paste the migration SQL
4. Execute the query

## After Migration

1. **Deploy the backend changes** (already done in your code)
2. **Test the onboarding flow**:
   - Register a new user
   - Select year, study goal, and notification preferences
   - Verify it saves without errors
3. **Verify existing users** still work:
   - Login with existing account
   - Check that default values were applied
   - Update preferences in Profile page

## What the Migration Does

The migration adds these columns to `public.users`:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `selected_year` | TEXT | '1st Year' | Academic year (1st/2nd/3rd/4th Year) |
| `study_goal` | TEXT | 'exam-prep' | Study preference (exam-prep, deep-learning, revision) |
| `notifications_enabled` | BOOLEAN | true | In-app notifications toggle |
| `email_notifications` | BOOLEAN | true | Email notifications toggle |
| `analytics_sharing` | BOOLEAN | false | Analytics data sharing consent |
| `updated_at` | TIMESTAMP | NOW() | Last update timestamp |

It also:
- Creates an index on `selected_year` for faster queries
- Adds column documentation comments
- Sets safe defaults for existing users

## Backend Changes Made

The backend has been updated to:
1. Accept `study_goal` and `notifications_enabled` in registration
2. Return these fields in login/register responses
3. Accept all preference fields in `PUT /api/auth/preferences`
4. Save and retrieve user preferences correctly

## How the Features Work

### Study Goal Options
These customize the learning experience:

1. **📚 Exam Preparation** (`exam-prep`)
   - Focuses on exam-oriented content
   - Prioritizes practice questions and summaries
   - Shows relevant exam tips

2. **🔬 Deep Learning** (`deep-learning`)
   - Provides detailed explanations
   - Shows related concepts and connections
   - Encourages thorough understanding

3. **⚡ Quick Revision** (`revision`)
   - Shows condensed notes and key points
   - Provides quick summaries
   - Optimized for fast review

### Notifications
Control how you receive updates:

1. **In-App Notifications** (`notifications_enabled`)
   - Study reminders within the app
   - Progress milestones
   - Daily study tips
   - Achievement notifications

2. **Email Notifications** (`email_notifications`)
   - Weekly progress reports (coming soon)
   - Study streak reminders (coming soon)
   - New content alerts (coming soon)
   - Account security notifications

### How They're Used in the App

**Frontend Usage:**
- Onboarding modal shows options on first login
- Profile page allows changing preferences anytime
- Dashboard adapts content based on study goal
- Notifications respect user preferences

**Backend Usage:**
- Stored in `users` table
- Returned with user data on login/register
- Updated via `PUT /api/auth/preferences`
- Used for personalizing recommendations (future)

## Rollback (If Needed)

If you need to remove these columns:

```sql
-- Remove columns (only if needed)
ALTER TABLE public.users DROP COLUMN IF EXISTS selected_year;
ALTER TABLE public.users DROP COLUMN IF EXISTS study_goal;
ALTER TABLE public.users DROP COLUMN IF EXISTS notifications_enabled;
ALTER TABLE public.users DROP COLUMN IF EXISTS email_notifications;
ALTER TABLE public.users DROP COLUMN IF EXISTS analytics_sharing;
ALTER TABLE public.users DROP COLUMN IF EXISTS updated_at;

-- Remove index
DROP INDEX IF EXISTS idx_users_selected_year;
```

## Testing Checklist

After applying the migration:

- [ ] Migration executed without errors
- [ ] Columns visible in database schema
- [ ] Existing users can still login
- [ ] New users can complete onboarding
- [ ] Study goal selection works
- [ ] Notification toggles work
- [ ] Profile page shows preferences
- [ ] Changes save correctly
- [ ] No console errors in frontend
- [ ] Backend logs show no errors

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Check backend logs on Render for API errors
4. Verify migration was applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users';`
