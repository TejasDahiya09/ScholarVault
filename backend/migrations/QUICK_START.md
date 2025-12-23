# 🚀 Quick Migration Guide

## Your Current Database State
From your schema, I can see you already have:
✅ `selected_year` - exists
✅ `email_notifications` - exists  
✅ `analytics_sharing` - exists

## What We Need to Add
❌ `study_goal` - **MISSING** (needed for exam-prep/deep-learning/revision)
❌ `notifications_enabled` - **MISSING** (needed for in-app notifications)
❌ `updated_at` - **MISSING** (timestamp for tracking changes)

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Click on your **ScholarVault** project
3. Click **SQL Editor** in the left sidebar (🗂️ icon)
4. Click **New Query** button

### Step 2: Copy & Paste the SQL
Copy the entire content from `APPLY_THIS_NOW.sql` and paste it into the SQL editor.

### Step 3: Run the Migration
Click the **Run** button (▶️) at the bottom right

You should see: ✅ Success. No rows returned

### Step 4: Verify It Worked
Run this verification query in SQL Editor:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

You should now see all these columns:
- id
- email
- password_hash
- name
- created_at
- selected_year ✅
- email_notifications ✅
- analytics_sharing ✅
- **study_goal** ✨ NEW
- **notifications_enabled** ✨ NEW
- **updated_at** ✨ NEW

### Step 5: Test Your App
1. Go to https://scholar-vault.netlify.app
2. Login or register
3. Complete the onboarding modal
4. Should save without errors! 🎉

---

## 🎯 What Each Column Does

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `study_goal` | TEXT | `'exam-prep'` | User's learning style preference |
| `notifications_enabled` | BOOLEAN | `true` | Toggle for in-app notifications |
| `updated_at` | TIMESTAMP | `NOW()` | Track when preferences change |

### Study Goal Values:
- `'exam-prep'` → 📚 Exam Preparation (focus on practice & tests)
- `'deep-learning'` → 🔬 Deep Learning (thorough understanding)
- `'revision'` → ⚡ Quick Revision (summaries & key points)

---

## ⚠️ Safety Notes

- ✅ Script uses `IF NOT EXISTS` - safe to run multiple times
- ✅ Existing data is preserved
- ✅ Default values set for existing users
- ✅ Indexes added for better performance
- ✅ No downtime required

---

## 🐛 Troubleshooting

**If you see "permission denied":**
- Make sure you're connected as the project owner
- Check your database connection isn't read-only

**If columns already exist:**
- That's fine! The script will skip them

**If you get an error:**
- Copy the error message
- Run: `\d public.users` to see current schema
- Share the error for help

---

## ✅ Done!
Once you run this SQL, refresh your app and try the onboarding flow. The error will be gone! 🚀
