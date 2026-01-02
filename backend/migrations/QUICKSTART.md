# 🚀 Quick Start - Database Setup

## Run This One SQL Script

```bash
# Go to Supabase Dashboard → SQL Editor
# Copy and run: backend/migrations/000_complete_schema_verification.sql
```

## What It Does

✅ Verifies all 10 tables exist  
✅ Creates missing tables/indexes  
✅ Adds 40+ performance indexes  
✅ Creates 4 helper functions  
✅ Sets up auto-update triggers  
✅ Configures security (RLS)  
✅ Shows verification report  

**Safe to run multiple times!**

## Expected Output

```
✅ SUCCESS: All structures created successfully!
Tables created: 10 / 10
Indexes created: 45+
Functions created: 4 / 4
```

## After Running

```bash
# Restart backend
cd backend
npm start

# Test in app
- Click bookmark icon ⭐
- Click checkmark ✅
- Both should work!
```

## Troubleshooting

**If script fails:**
1. Check you have CREATE permissions
2. Ensure auth.users table exists (Supabase default)
3. Run as database owner

**Need help?**
See [SCHEMA_SETUP_GUIDE.md](SCHEMA_SETUP_GUIDE.md) for detailed instructions.

---

**Files:**
- 📄 [000_complete_schema_verification.sql](000_complete_schema_verification.sql) - Main script
- 📖 [SCHEMA_SETUP_GUIDE.md](SCHEMA_SETUP_GUIDE.md) - Full documentation
