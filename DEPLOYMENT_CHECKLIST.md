# 🚀 Bookmark & Completion Feature - Deployment Checklist

## ✅ Pre-Deployment Verification

- [ ] **CRITICAL: Create `user_bookmarks` table** (see migrations/RUN_THIS_FIRST.md)
- [x] `user_study_progress` table exists
- [x] Backend code updated and tested
- [x] No syntax errors in code
- [x] Routes properly registered
- [x] Controllers implemented
- [x] Database layer restored

## 📋 Deployment Steps

### 0. **⚠️ CREATE DATABASE TABLE FIRST!**

```sql
-- Run this in Supabase SQL Editor BEFORE deploying backend
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_note_bookmark UNIQUE(user_id, note_id)
);

CREATE INDEX idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_note_id ON public.user_bookmarks(note_id);
CREATE INDEX idx_user_bookmarks_bookmarked_at ON public.user_bookmarks(bookmarked_at DESC);
```

See [migrations/RUN_THIS_FIRST.md](backend/migrations/RUN_THIS_FIRST.md) for details.

### 1. **Backend Deployment**

```bash
cd backend

# Pull latest changes (if using git)
git pull

# Install any new dependencies (if needed)
npm install

# Restart the server
npm start
# or if using PM2:
pm2 restart scholarvault-backend

# or if on Render/Heroku, just push:
git push render main
```

### 2. **Verify Backend is Running**

```bash
# Test health check
curl http://localhost:3000/healthz

# Should return:
# {"status":"ok","timestamp":"...","environment":"development"}
```

### 3. **Test Bookmarks API**

```bash
# Replace YOUR_JWT_TOKEN with actual token from login
# Get bookmarks (should return empty array initially)
curl -X GET http://localhost:3000/api/bookmarks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
# {"bookmarks":[]}
```

### 4. **Test Completion API**

```bash
# Mark a note as completed (replace note_id and subject_id)
curl -X POST http://localhost:3000/api/notes/YOUR_NOTE_ID/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subjectId":"YOUR_SUBJECT_ID","completed":true}'

# Expected response:
# {"success":true,"completed":true,"message":"Note marked as completed"}
```

### 5. **Frontend Testing**

Open your ScholarVault app and test:

1. **Login** to your account
2. **Navigate** to a subject with notes
3. **Click the bookmark icon** (⭐) on a note
   - Should see "Saved!" popup
   - Icon should change to filled star
4. **Click the checkmark** (✓) on a note
   - Should see "Completed!" popup with confetti
   - Icon should show as checked
5. **Go to Dashboard**
   - Bookmarked notes should appear in bookmarks section
   - Completed notes should update progress stats

## 🔍 Troubleshooting

### Issue: "Route not found" error

**Solution:** Make sure backend restarted after code changes
```bash
# Check if server is running
curl http://localhost:3000/healthz

# Restart server
npm start
```

### Issue: "User not authenticated" error

**Solution:** Token expired or invalid
- Log out and log back in to get fresh token
- Check that token is being sent in Authorization header

### Issue: Database connection error

**Solution:** Verify Supabase credentials
```bash
# Check .env file has:
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
```

### Issue: Bookmarks not showing

**Solution:** Clear cache and refresh
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Issue: Foreign key constraint error

**Solution:** Ensure user_id exists in auth.users table
```sql
-- Run in Supabase SQL editor:
SELECT id, email FROM auth.users WHERE id = 'your_user_id';
```

## 📊 Monitoring

### Check Logs

```bash
# View backend logs
tail -f logs/app.log

# Or if using PM2:
pm2 logs scholarvault-backend
```

### Database Queries

```sql
-- Check bookmarks count
SELECT COUNT(*) FROM user_bookmarks;

-- Check recent bookmarks
SELECT * FROM user_bookmarks 
ORDER BY bookmarked_at DESC 
LIMIT 10;

-- Check completion stats
SELECT 
  user_id,
  COUNT(*) as total_completed,
  SUM(total_time_spent) as total_time
FROM user_study_progress 
WHERE is_completed = true
GROUP BY user_id;
```

## ✅ Success Criteria

- [ ] Backend starts without errors
- [ ] Health check returns 200 OK
- [ ] Bookmarks API returns valid responses
- [ ] Completion API updates database
- [ ] Frontend bookmark icon toggles correctly
- [ ] Frontend completion checkmark works
- [ ] Dashboard shows bookmarked notes
- [ ] Progress stats update correctly
- [ ] No console errors in browser
- [ ] No server errors in logs

## 🎉 Post-Deployment

Once everything works:
1. Test with multiple users
2. Monitor error rates
3. Check performance metrics
4. Update documentation if needed

## 📞 Support

If issues persist:
1. Check [BOOKMARK_FIX_README.md](BOOKMARK_FIX_README.md) for detailed docs
2. Review code changes in Git history
3. Check browser console for errors
4. Check backend logs for database errors
5. Verify environment variables are set correctly

---

**Last Updated:** January 3, 2026
**Status:** Ready for deployment ✅
