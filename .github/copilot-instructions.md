# ScholarVault - Copilot Instructions

## Project Overview
ScholarVault is an educational platform with:
- **Frontend:** React + Vite + TailwindCSS + Zustand
- **Backend:** Express.js + Supabase + AWS S3 + Google Vertex AI
- **Database:** PostgreSQL via Supabase

## 🔒 Non-Negotiable Engineering Rules

### 1. Authentication & Authorization
- ALL protected routes MUST use `authenticate` middleware
- ALL user-data queries MUST filter by `userId`
- NEVER expose data without ownership checks

### 2. Data Integrity
```javascript
// ❌ NEVER do this for authoritative data
items.forEach(async (item) => {
  await processItem(item);
});

// ✅ DO this instead
await Promise.all(items.map(item => processItem(item)));
// OR for sequential
for (const item of items) {
  await processItem(item);
}
```

### 3. Cache Management
- Mutations MUST invalidate related cache
- Progress endpoints should NOT be cached
- Use `invalidateCache()` after writes

### 4. Error Handling
```javascript
// ✅ Always handle errors with user feedback
try {
  const result = await apiCall();
  return result;
} catch (err) {
  console.error("Context:", err);
  throw new Error("User-friendly message");
}
```

### 5. Database Queries
```javascript
// ❌ Avoid select('*')
.select("*")

// ✅ Specify columns
.select("id, name, created_at")
```

### 6. No Debug Code in Production
- Remove all `console.log` before committing
- No `TODO` or `FIXME` in production code

## Code Patterns

### Protected Route Pattern
```javascript
router.get("/resource", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const data = await db.getByUserId(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
```

### Frontend API Call Pattern
```javascript
// client.js automatically adds JWT
const { data } = await client.get('/api/resource');
```

### State Update Pattern
```javascript
// Optimistic update with rollback
const previous = state;
setState(optimistic);
try {
  await apiCall();
} catch {
  setState(previous);
  toast.error("Failed to update");
}
```

## File Structure
- `backend/src/routes/` - Express routes
- `backend/src/controllers/` - Request handlers
- `backend/src/services/` - Business logic
- `backend/src/db/` - Database access
- `frontend/src/pages/` - React pages
- `frontend/src/components/` - Reusable components
- `frontend/src/api/` - API client
- `frontend/src/store/` - Zustand stores

## Key Dependencies
- Supabase client for DB
- AWS S3 for file storage
- Vertex AI for AI features
- bcrypt for password hashing
- jsonwebtoken for JWT

## Testing Commands
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run dev
```
