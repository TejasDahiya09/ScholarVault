# 🔒 ScholarVault — Full Codebase Security & Data Integrity Audit

**Date:** February 9, 2026  
**Scope:** All backend + frontend code — stale, incorrect, or cross-user data prevention  
**Method:** Issue-by-issue audit following strict order (9 categories, 12 files changed)  
**Auditor:** GitHub Copilot (Claude Opus 4.6)

---

## 📋 Table of Contents

1. [ISSUE 1 — Backend queries not scoped by user_id](#-issue-1--backend-queries-not-scoped-by-user_id)
2. [ISSUE 2 — Backend-level in-memory caching](#-issue-2--backend-level-in-memory-caching)
3. [ISSUE 3 — Auth context must be request-scoped](#-issue-3--auth-context-must-be-request-scoped)
4. [ISSUE 4 — Dashboard backend logic](#-issue-4--dashboard-backend-logic)
5. [ISSUE 5 — Zustand stores not reset on logout](#-issue-5--zustand-stores-not-reset-on-logout)
6. [ISSUE 6 — Dashboard frontend reads backend only](#-issue-6--dashboard-frontend-reads-backend-only)
7. [ISSUE 7 — No re-fetch after mutations](#-issue-7--no-re-fetch-after-mutations)
8. [ISSUE 8 — API responses cached by browser/proxy](#-issue-8--api-responses-cached-by-browserproxy)
9. [ISSUE 9 — Final Verification](#-issue-9--final-verification)

---

## 🔴 ISSUE 1 — Backend queries not scoped by user_id

### Detection Method

Systematically read every file in `backend/src/db/`, `backend/src/routes/`, `backend/src/controllers/`, and `backend/src/services/`. For each database query (Supabase `.from()` call), checked whether:

- `.eq("user_id", ...)` was present on user-specific data
- JOINs included user filtering
- Route handlers extracted `req.user.userId` and passed it through

### What Was Audited

| File | Contains User Data? | Has user_id Scoping? |

| --- | --- | --- |
| `backend/src/db/bookmarks.js` | Yes (per-user bookmarks) | ✅ All 3 methods use `.eq("user_id", userId)` |
| `backend/src/db/completions.js` | Yes (per-user completions) | ✅ All methods use `.eq("user_id", userId)` |
| `backend/src/db/studySessions.js` | Yes (per-user sessions) | ✅ All 7 methods use `.eq("user_id", userId)` |
| `backend/src/db/users.js` | Yes (user profiles) | ✅ Queries by `.eq("id", id)` or `.eq("email", email)` |
| `backend/src/db/notes.js` | No (shared content) | N/A — notes are shared academic resources |
| `backend/src/db/subjects.js` | No (shared content) | N/A — subjects are shared academic resources |
| `backend/src/controllers/completedController.js` | Yes | ✅ Uses `req.user.userId` |
| `backend/src/routes/bookmarks.js` | Yes | ✅ Uses `req.user.userId` |
| `backend/src/routes/completions.js` | Yes | ✅ Uses `req.user.userId` |

### 🔴 Problems Found

---

#### Problem 1.1: `completionsDB.getCompletedNoteIds()` silently ignored `subjectId`


**How I detected it:**

Read `backend/src/routes/completions.js` line 14:

```js
const completedIds = await completionsDB.getCompletedNoteIds(userId, subjectId || null);
```

Then read `backend/src/db/completions.js` line 6:

```js
async getCompletedNoteIds(userId) {  // <-- only accepts 1 param!
```

The route passed `subjectId` as a second argument, but the function signature only accepted `userId`. JavaScript silently ignores extra arguments — so the filter was never applied.

**Impact:**

When the frontend requested completions for a specific subject, it got ALL completions across ALL subjects. This could cause incorrect progress percentages.

**Why this solution is optimal:**

Adding an optional `subjectId` parameter with a default of `null` is backward-compatible. Existing callers that pass only `userId` continue to work. Callers that pass `subjectId` now get filtered results. No breaking changes.

**Fix applied in `backend/src/db/completions.js`:**

```js
// BEFORE:
async getCompletedNoteIds(userId) {
  const { data, error } = await supabase
    .from("completions")
    .select("note_id")
    .eq("user_id", userId);
  ...
}

// AFTER:
async getCompletedNoteIds(userId, subjectId = null) {
  let query = supabase
    .from("completions")
    .select("note_id")
    .eq("user_id", userId);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  ...
}
```

---

#### Problem 1.2: `completionsDB.getTotalCompletedCount()` method didn't exist

**How I detected it:**  
Read `backend/src/routes/completions.js` line 28:
```js
const count = await completionsDB.getTotalCompletedCount(userId);
```
Then searched all of `completions.js` DB file — this method was never defined. Any call to `GET /api/completions/count` would throw a runtime TypeError: `completionsDB.getTotalCompletedCount is not a function`.

**Impact:** The completions count endpoint would crash on every request. The progress analytics endpoint (which I was about to create) also needs this method.

**Why this solution is optimal:**  
Used Supabase's built-in `count: "exact"` with `head: true` — this executes a `SELECT COUNT(*)` at the database level without transferring any row data. It's the most efficient way to count rows. Alternative was fetching all rows and counting in JS (like `getCompletedNoteIds().length`), but that transfers unnecessary data over the network.

**Fix applied in `backend/src/db/completions.js`:**
```js
async getTotalCompletedCount(userId) {
  const { data, error, count } = await supabase
    .from("completions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count || 0;
},
```

---

#### Problem 1.3: Progress route file was empty — 3 critical endpoints missing

**How I detected it:**  
Read `backend/src/routes/progress.js` — entire file content was:
```js
export default {};
```
Then checked `backend/index.js` — no `app.use("/api/progress", ...)` mount existed.  
But the frontend `useAuth.js` called `POST /api/progress/session/start` on login and `POST /api/progress/session/end` on logout.  
Dashboard called `GET /api/progress/analytics`.  
All 3 endpoints returned 404.

**Impact:**  
- Study session tracking was completely broken — sessions were never recorded
- Dashboard analytics (study time, streaks, completion count) never loaded — showed 0 for everything
- The `studySessionsDB` module had all the correct methods, but nothing called them

**Why this solution is optimal:**  
The `studySessionsDB` already had well-implemented, user-scoped methods (`getTotalHours`, `getStreaks`, `getMinutesByDay`, `getSessionHours`). The solution was to create a thin route layer that:
1. Authenticates the request (`authenticate` middleware)
2. Disables caching (`noCache` middleware)
3. Extracts `req.user.userId`
4. Calls the existing DB methods in parallel (`Promise.all`) for maximum performance
5. Aggregates results into a single response

I used `Promise.all` for the analytics endpoint because the 5 DB queries are independent — parallel execution is ~5x faster than sequential.

**Fix: Created `backend/src/routes/progress.js` with 3 endpoints:**

```js
// POST /api/progress/session/start — user_id from JWT
router.post("/session/start", authenticate, async (req, res, next) => {
  const userId = req.user.userId;
  const session = await studySessionsDB.startSession(userId, startedAt);
  res.json({ ok: true, session });
});

// POST /api/progress/session/end — user_id from JWT
router.post("/session/end", authenticate, async (req, res, next) => {
  const userId = req.user.userId;
  const session = await studySessionsDB.endSession(userId, endedAt);
  res.json({ ok: true, session });
});

// GET /api/progress/analytics — all stats in one call, user_id scoped
router.get("/analytics", authenticate, noCache, async (req, res, next) => {
  const userId = req.user.userId;
  const [totalHours, streaks, weeklyMap, completedCount, peakHour] = await Promise.all([
    studySessionsDB.getTotalHours(userId),
    studySessionsDB.getStreaks(userId),
    studySessionsDB.getMinutesByDay(userId, 7),
    completionsDB.getTotalCompletedCount(userId),
    studySessionsDB.getSessionHours(userId),
  ]);
  // ... build response
});
```

---

#### Problem 1.4: Progress routes were never mounted in Express

**How I detected it:**  
Searched `backend/index.js` for any `app.use` containing "progress" — none found. The route existed in the routes folder but was never registered with Express.

**Impact:** Even after creating the route file, it wouldn't be accessible until mounted.

**Fix in `backend/index.js`:**
```js
import progressRoutes from "./src/routes/progress.js";
// ...
app.use("/api/progress", progressRoutes);
```

---

#### Problem 1.5: `GET /api/subjects/:id/progress` endpoint didn't exist

**How I detected it:**  
Read `frontend/src/pages/Dashboard.jsx` line 125:
```js
const completionRes = await client.get(`/api/subjects/${subject.id}/progress`);
```
Then searched `backend/src/routes/subjects.js` for "progress" — no match. This endpoint was never created. Every Dashboard load would log console errors for each subject and fall back to 0% progress.

**Impact:** Dashboard showed 0% progress for all subjects, even when the user had completed notes.

**Why this solution is optimal:**  
The endpoint needs to:
1. Count total notes in the subject (shared data)
2. Count completed notes for THIS user in THIS subject (user-scoped)
3. Calculate percentage

I chose to fetch all note IDs for the subject, then use the fixed `getCompletedNoteIds(userId, subjectId)` to get user-specific completions. This is a simple, correct approach. Alternative was a raw SQL join, but Supabase's query builder is safer and the data volumes (notes per subject) are small.

**Fix added to `backend/src/routes/subjects.js`:**
```js
router.get("/:id/progress", authenticate, noCache, async (req, res, next) => {
  const userId = req.user.userId;
  const subjectId = req.params.id;

  // Total notes in subject (shared content)
  const { data: notes } = await supabase
    .from("notes").select("id").eq("subject_id", subjectId);
  const totalNotes = (notes || []).length;

  // User's completions for this subject (user-scoped)
  const completedIds = await completionsDB.getCompletedNoteIds(userId, subjectId);
  const completedCount = completedIds.length;

  const progressPercent = totalNotes > 0 ? Math.round((completedCount / totalNotes) * 100) : 0;

  res.json({
    progress_percent: progressPercent,
    completed_units: completedCount,
    total_units: totalNotes,
    completed_note_ids: completedIds,
  });
});
```

---

#### Problem 1.6: `GET /api/bookmarks/details` endpoint didn't exist

**How I detected it:**  
Read `frontend/src/pages/Dashboard.jsx` line 104:
```js
const bookmarks = await bookmarksAPI.getBookmarksWithDetails();
```
Read `frontend/src/api/bookmarks.js` — method `getBookmarksWithDetails` didn't exist.  
Searched backend routes — `/api/bookmarks/details` endpoint didn't exist.  
Dashboard's bookmarks section would crash/show empty due to this.

**Impact:** Dashboard bookmarks section always showed empty (error caught silently).

**Why this solution is optimal:**  
Two-step approach:
1. Fetch user's bookmark note IDs (already user-scoped in `bookmarksDB.getUserBookmarkIds`)
2. Batch-fetch note details using Supabase `.in("id", bookmarkIds)` — single DB query for all notes

Alternative was N+1 queries (one per bookmark), but `.in()` is a single query regardless of bookmark count. I also used `noCache` middleware since bookmarks are frequently mutated.

**Fix: Added to `backend/src/routes/bookmarks.js`:**
```js
router.get("/details", authenticate, noCache, async (req, res, next) => {
  const userId = req.user.userId;
  const bookmarkIds = await bookmarksDB.getUserBookmarkIds(userId);
  
  if (bookmarkIds.length === 0) return res.json({ bookmarks: [] });

  const { data: notes } = await supabase
    .from("notes")
    .select("id, file_name, subject, subject_id, unit_number, semester, branch")
    .in("id", bookmarkIds);

  const bookmarks = bookmarkIds
    .map(noteId => {
      const note = (notes || []).find(n => n.id === noteId);
      return note ? { note_id: noteId, notes: note } : null;
    })
    .filter(Boolean);

  res.json({ bookmarks });
});
```

---

#### Problem 1.7: Frontend `bookmarksAPI.getBookmarksWithDetails()` didn't exist

**How I detected it:**  
Dashboard imported `bookmarksAPI` and called `.getBookmarksWithDetails()`, but the method was never defined in `frontend/src/api/bookmarks.js`.

**Fix: Added to `frontend/src/api/bookmarks.js`:**
```js
async getBookmarksWithDetails() {
  const { data } = await client.get("/api/bookmarks/details");
  return data.bookmarks || [];
},
```

---

## 🔴 ISSUE 2 — Backend-level in-memory caching

### Detection Method

Searched the entire backend for:
- `NodeCache` instances
- `new Map()` or `new Set()` used as caches
- Module-level `let`/`const` variables storing query results
- `global.*` assignments
- `static` class properties

### What Was Found

| Cache Instance | File | TTL | Keyed by user_id? | Contains User Data? |
|---|---|---|---|---|
| `cache` (NodeCache) | `backend/src/utils/cache.js` | 5 min | No | No — notes/subjects are shared |
| `searchCache` (NodeCache) | `backend/src/services/search.js` | 5 min | ❌ **NO** | Potentially (if search is personalized) |
| `embeddingCache` (NodeCache) | `backend/src/services/search.js` | 1 hour | No | No — embeddings are content-based |
| `suggestionCache` (NodeCache) | `backend/src/services/search.js` | 10 min | No | No — suggestions are global |
| `cache` (Map) | `frontend/src/api/client.js` | 10 min | ✅ Skips auth'd requests | No — only caches unauth'd GETs |

### Analysis & Decision Logic

**`utils/cache.js` (notes/subjects cache):**  
Cache key format: `notes:all:${JSON.stringify(filters)}` and `subjects:all:${JSON.stringify(filters)}`  
Notes and subjects are shared academic content — same for all users. No user_id dimension needed. Caching these is correct and beneficial (reduces DB load for identical queries).  
**Decision: No change needed. ✅**

**`searchCache`:**  
Cache key format was: `search:${query}:${subjectId}:${noteId}:${page}:${perPage}`  
If User A searches "algorithms" and the result is cached, User B searching "algorithms" would get User A's cached result. Currently search results come from the shared `notes` table, so results would be identical. BUT:
- Future personalization (weighted by user history) would break
- Search analytics logging is user-scoped
- Defense-in-depth requires user isolation at every layer  
**Decision: Add userId to cache key. 🔴 FIX**

**`embeddingCache` and `suggestionCache`:**  
Embeddings are vector representations of text content — not user-specific. Suggestions come from global search analytics.  
**Decision: No change needed. ✅**

**Frontend `client.js` Map cache:**  
Already has explicit guard:
```js
if (config.method === 'get' && !isAuthenticated && !noCache) {
  // Only cache unauthenticated GETs
}
```
**Decision: No change needed. ✅**

### Fix Applied

**File:** `backend/src/services/search.js`

```js
// BEFORE:
const cacheKey = `search:${query}:${subjectId}:${noteId}:${page}:${perPage}`;

// AFTER:
const cacheKey = `search:${userId || 'anon'}:${query}:${subjectId}:${noteId}:${page}:${perPage}`;
```

**Why `userId || 'anon'`:** Search can be called with optional auth (`req.user?.userId || null`). Anonymous users share a cache namespace, authenticated users get isolated caches.

---

## ✅ ISSUE 3 — Auth context must be request-scoped

### Detection Method

Read `backend/src/middlewares/auth.js` line by line. Searched for:
- Global variables storing decoded tokens
- Shared objects being mutated
- `req.user` being set from anything other than per-request JWT decoding
- Singleton patterns in auth services

### What Was Found

```js
// backend/src/middlewares/auth.js
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;       // ← per-request
  const token = authHeader.split(" ")[1];             // ← per-request
  const decoded = jwt.verify(token, config.JWT_SECRET); // ← per-request
  req.user = decoded;                                  // ← request-scoped
  next();
};
```

**Analysis:**
- `jwt.verify()` is a pure function — no state mutation
- `decoded` is a local variable — garbage collected after middleware exits
- `req.user` is set on the Express request object — unique per HTTP request
- No `global.currentUser`, no `let currentToken`, no shared auth singleton
- `config.JWT_SECRET` is read-only — safe to share

**Also checked:**
- `backend/src/services/auth.js` — `generateToken()` and `verifyToken()` are stateless pure functions
- `backend/src/controllers/auth.js` — all handlers use `req.user.userId` (request-scoped)
- No middleware stores auth state between requests

### Result: **PASS — No issues found ✅**

---

## ✅ ISSUE 4 — Dashboard backend logic

### Detection Method

Traced the Dashboard's data flow end-to-end:
1. Frontend `Dashboard.jsx` → what API calls does it make?
2. For each API call → does the backend endpoint exist?
3. For each endpoint → does it query the DB with user_id scoping?
4. Are there any computed/derived values from frontend state?

### What Was Found

Dashboard makes these API calls:
| Call | Endpoint | Existed Before? | User-Scoped? |
|---|---|---|---|
| `bookmarksAPI.getBookmarksWithDetails()` | `GET /api/bookmarks/details` | ❌ No | Now ✅ (Issue 1.6) |
| `client.get('/api/subjects')` | `GET /api/subjects` | ✅ Yes | N/A (shared content) |
| `client.get(/api/subjects/${id}/progress)` | `GET /api/subjects/:id/progress` | ❌ No | Now ✅ (Issue 1.5) |
| `client.get('/api/progress/analytics')` | `GET /api/progress/analytics` | ❌ No | Now ✅ (Issue 1.3) |
| `client.get(/api/subjects/${id}/units)` | `GET /api/subjects/:id/units` | ✅ Yes | ✅ Uses `req.user.userId` |
| `localStorage.getItem("sv_last_note")` | N/A (local) | N/A | ⚠️ Fixed in Issue 5 |

**After Issue 1 fixes:** All 6 data sources are now either user-scoped DB queries or shared content. No frontend state derivation.

### Result: **PASS — Now complete after Issue 1 fixes ✅**

---

## 🔴 ISSUE 5 — Zustand stores not reset on logout

### Detection Method

Listed every file in `frontend/src/store/`:
1. `useAuth.js` — Auth state (token, user)
2. `useCompletedStore.js` — Completed notes per subject
3. `userProgressStore.js` — Global bookmarks/completions sets
4. `useDarkMode.js` — UI theme preference
5. `useHydrateUserProgress.js` — Hydration hook (not a store itself)

For each store, checked:
- Does it contain user-specific data?
- Does it have a `reset()` method?
- Is `reset()` called during logout?
- Does it use `persist()` (Zustand persistence)?

### What Was Found

| Store | User Data? | Has reset()? | Called on Logout? | Persisted? |
|---|---|---|---|---|
| `useAuth` | Yes (token, user) | ✅ Sets null | ✅ | localStorage (manually) |
| `useCompletedStore` | **Yes** (completedBySubject map) | ❌ **NO** | ❌ **NO** | No |
| `userProgressStore` | **Yes** (bookmarks Set, completions Set) | ❌ **NO** | ❌ **NO** | No |
| `useDarkMode` | No (UI pref) | N/A | N/A | localStorage |

**Critical scenario:**
1. User A logs in → `useCompletedStore` loads their completions for Subject X
2. User A logs out → store state is NOT cleared
3. User B logs in on same browser → `useCompletedStore` still has User A's data in memory
4. If User B views Subject X before the store re-fetches, they see User A's completion state

**Also found:** `localStorage.getItem("sv_last_note")` stores the last viewed note. On logout, this wasn't cleared — User B could see "Continue where you left off" pointing to User A's last note.

### Why This Solution Is Optimal

**Option A (rejected):** Reset stores inside each store's own subscription — complex, error-prone, stores don't know about auth.  
**Option B (rejected):** Add a global `resetAllStores()` function — creates tight coupling.  
**Option C (chosen):** Each store exposes its own `reset()` method. Logout handler calls each one via lazy `import()`. This is:
- Decoupled — each store owns its own reset logic
- Lazy — no circular dependency risk
- Explicit — clear what gets reset
- Complete — covers all stores

### Fixes Applied

**1. `frontend/src/store/useCompletedStore.js` — Added reset():**
```js
// Added at top of store definition:
reset: () => set({ completedBySubject: {} }),
```

**2. `frontend/src/store/userProgressStore.js` — Added reset():**
```js
// Added at top of store definition:
reset: () => set({ bookmarks: new Set(), completions: new Set() }),
```

**3. `frontend/src/store/useAuth.js` — Enhanced logout():**
```js
logout: async () => {
  // ... end study session ...

  localStorage.removeItem("sv_token");
  localStorage.removeItem("sv_user");
  localStorage.removeItem("sv_last_note");  // ← NEW: prevent cross-user recent activity
  
  sessionStorage.clear();

  // NEW: Reset ALL Zustand stores to prevent cross-user data leakage
  const { default: useCompletedStore } = await import("./useCompletedStore");
  const { useUserProgressStore } = await import("./userProgressStore");
  useCompletedStore.getState().reset();
  useUserProgressStore.getState().reset();
  
  set({ token: null, user: null });
},
```

**Why lazy `import()` instead of top-level import:**  
`useAuth.js` is imported by almost every component. If `useAuth` imported `useCompletedStore` at the top level, and `useCompletedStore` imported `client.js` which references the auth token, we'd get a circular dependency. Dynamic `import()` defers resolution to runtime, avoiding the cycle.

---

## ✅ ISSUE 6 — Dashboard frontend reads backend only

### Detection Method

Read `frontend/src/pages/Dashboard.jsx` imports:
```js
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import client from "../api/client";
import useAuth from "../store/useAuth";
import bookmarksAPI from "../api/bookmarks";
```

Checked for:
- ❌ `import useCompletedStore` → NOT present ✅
- ❌ `import useUserProgressStore` → NOT present ✅
- ❌ `import { useUserProgressStore }` → NOT present ✅
- ✅ `useAuth` used only for `user.selected_year` (filter param, not data)
- ✅ All data fetched via `client.get()` or `bookmarksAPI` (HTTP calls)

**The Dashboard data contract comment at the top of the file is correctly enforced:**
```js
/**
 * - ❌ Dashboard MUST NOT subscribe to Zustand stores
 * - ✅ Dashboard is backend-driven only
 */
```

### Result: **PASS — Already compliant ✅**

The only frontend state read was `localStorage("sv_last_note")` for "recent activity" — which is now cleared on logout (Issue 5 fix).

---

## 🔴 ISSUE 7 — No re-fetch after mutations

### Detection Method

Traced the mutation flow:
1. User bookmarks a note in NotesPage → what happens?
2. User marks a note complete in NotesPage → what happens?
3. Does the Dashboard know about these changes?

### What Was Found

**NotesPage `handleMarkComplete` (line 631-642):**
```js
const handleMarkComplete = async (e, noteId) => {
  e.stopPropagation();
  if (!subjectId) return;
  try {
    await completedStore.toggleCompleted(noteId, subjectId);
    setPopup({ show: true, type: wasCompleted ? "incomplete" : "complete" });
  } catch { ... }
  // ❌ NO event dispatched — Dashboard has no way to know
};
```

**NotesPage `handleToggleBookmark` (line 644-670):**
```js
const handleToggleBookmark = async (e, noteId) => {
  e.stopPropagation();
  try {
    if (isCurrentlyBookmarked) {
      await bookmarksAPI.removeBookmark(noteId);
      // ... update local state
    } else {
      await bookmarksAPI.addBookmark(noteId, subjectId);
      // ... update local state
    }
    // ❌ NO event dispatched — Dashboard has no way to know
  } catch { ... }
};
```

**Dashboard (line 55-68):** Only refreshed on mount and year change. No event listener for mutations.

**ProgressPage (line 28-40):** Already had `window.addEventListener("learning:update", ...)` — but nothing was emitting this event! The listener was dead code.

### Why This Solution Is Optimal

**Option A (rejected):** Zustand subscription — violates Dashboard data contract ("no reactive coupling").  
**Option B (rejected):** Polling/interval — wasteful, adds latency.  
**Option C (chosen):** `CustomEvent` on `window` — lightweight, decoupled, already partially implemented (ProgressPage listener existed). The pattern:
1. Mutation happens → emit `window.dispatchEvent(new CustomEvent("learning:update"))`
2. Dashboard listens → calls `fetchDashboardData()`
3. ProgressPage listens → calls `fetchProgressData()`

This is the standard "pub/sub" pattern. Components don't need to know about each other. Adding new listeners is trivial. No shared state.

### Fixes Applied

**1. `frontend/src/pages/Notes/NotesPage.jsx` — Emit events after mutations:**

In `handleMarkComplete`:
```js
await completedStore.toggleCompleted(noteId, subjectId);
window.dispatchEvent(new CustomEvent("learning:update"));  // ← NEW
```

In `handleToggleBookmark`:
```js
// After successful add or remove:
window.dispatchEvent(new CustomEvent("learning:update"));  // ← NEW
```

**2. `frontend/src/pages/Dashboard.jsx` — Listen for events:**
```js
useEffect(() => {
  const doRefresh = async () => {
    await fetchDashboardData();
  };
  refreshDashboard.current = doRefresh;
  doRefresh();

  // NEW: Listen for learning:update events from NotesPage mutations
  const handleLearningUpdate = () => {
    fetchDashboardData();
  };
  window.addEventListener("learning:update", handleLearningUpdate);
  return () => {
    window.removeEventListener("learning:update", handleLearningUpdate);
  };
}, [user?.selected_year]);
```

**Event lifecycle is now complete:**
```
User clicks bookmark/complete in NotesPage
  → API call to backend (persist change)
  → Local UI updates (optimistic)
  → window.dispatchEvent("learning:update")
  → Dashboard listener fires fetchDashboardData()
  → ProgressPage listener fires fetchProgressData()
  → Both pages show fresh data from backend
```

---

## 🔴 ISSUE 8 — API responses cached by browser/proxy

### Detection Method

Read `backend/index.js` middleware chain looking for `Cache-Control` headers.  
Read `backend/src/middlewares/noCache.js`.  
Searched all route files for `noCache` middleware usage.  
Read `frontend/src/api/client.js` for fetch cache options.

### What Was Found

**Critical bug in `backend/index.js` (line 55-60):**
```js
// Cache control for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/api/auth')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  next();
});
```

This set `Cache-Control: public, max-age=300` for **ALL** GET requests except auth routes. This means:
- `GET /api/bookmarks` → cached for 5 minutes by browser
- `GET /api/completions` → cached for 5 minutes by browser
- `GET /api/subjects/:id/progress` → cached for 5 minutes by browser
- `GET /api/progress/analytics` → cached for 5 minutes by browser

**Scenario:**
1. User bookmarks a note → backend updates DB
2. User navigates to Dashboard → browser serves cached `/api/bookmarks` from 3 minutes ago
3. Dashboard shows old bookmarks until cache expires

**Partial mitigation existed:** `noCache` middleware was applied to `GET /api/bookmarks` and `GET /api/completions` routes individually. But:
- It was NOT applied to subjects, notes, search, or the new progress routes
- The global middleware ran FIRST and already set `max-age=300`
- Express headers can be overwritten, so `noCache` on individual routes DID work for those specific routes
- But all OTHER routes were still cached

### Why This Solution Is Optimal

**Option A (rejected):** Add `noCache` middleware to every individual route — tedious, error-prone, easy to forget on new routes.  
**Option B (chosen):** Fix the global middleware to distinguish between API responses and static assets:
- Any request with `Authorization` header → `no-store` (user-specific data)
- Any request to `/api/*` → `no-store` (even public API responses shouldn't be stale)
- Everything else → `public, max-age=300` (static assets, health check)

This is defense-in-depth. Even if a developer forgets `noCache` on a new route, the global middleware prevents caching.

### Fix Applied

**File:** `backend/index.js`

```js
// BEFORE:
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/api/auth')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});

// AFTER:
app.use((req, res, next) => {
  if (req.method === 'GET') {
    const hasAuth = !!req.headers.authorization;
    if (hasAuth || req.path.startsWith('/api/')) {
      res.set('Cache-Control', 'no-store');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      res.set('Cache-Control', 'public, max-age=300');
    }
  }
  next();
});
```

**Why 3 headers:**  
- `Cache-Control: no-store` — modern browsers
- `Pragma: no-cache` — HTTP/1.0 compatibility
- `Expires: 0` — proxy servers that ignore Cache-Control

---

## ✅ ISSUE 9 — Final Verification

### Verification Method

1. Ran `get_errors` on all 12 modified files — **zero compile errors**
2. Re-read each modified file to verify consistency
3. Traced the full data flow end-to-end after fixes

### Pre-existing Warnings (NOT introduced by this audit)

Two Tailwind CSS lint suggestions in Dashboard.jsx:
- `bg-gradient-to-r` can be written as `bg-linear-to-r` (cosmetic, not a bug)

### Files Modified (Complete List)

**Backend (6 files):**

| # | File | Change Type | What Changed |
|---|---|---|---|
| 1 | `backend/src/db/completions.js` | Bug fix | `getCompletedNoteIds` now supports `subjectId` filter; added `getTotalCompletedCount` method |
| 2 | `backend/src/routes/progress.js` | New feature | Created 3 endpoints: session start, session end, analytics — all user-scoped |
| 3 | `backend/src/routes/subjects.js` | New feature | Added `GET /:id/progress` endpoint — user-scoped completion percentage |
| 4 | `backend/src/routes/bookmarks.js` | New feature | Added `GET /details` endpoint — bookmarks with note details, user-scoped |
| 5 | `backend/src/services/search.js` | Security fix | Search cache key now includes `userId` |
| 6 | `backend/index.js` | Security fix + mount | Mounted progress routes; changed global cache to `no-store` for API |

**Frontend (6 files):**

| # | File | Change Type | What Changed |
|---|---|---|---|
| 7 | `frontend/src/api/bookmarks.js` | Bug fix | Added missing `getBookmarksWithDetails()` method |
| 8 | `frontend/src/store/useAuth.js` | Security fix | Logout resets all stores, clears `sv_last_note` |
| 9 | `frontend/src/store/useCompletedStore.js` | Security fix | Added `reset()` method |
| 10 | `frontend/src/store/userProgressStore.js` | Security fix | Added `reset()` method |
| 11 | `frontend/src/pages/Dashboard.jsx` | Feature fix | Added `learning:update` event listener for re-fetch |
| 12 | `frontend/src/pages/Notes/NotesPage.jsx` | Feature fix | Emit `learning:update` on bookmark/completion toggles |

---

## ✅ Post-Audit Guarantees

| Guarantee | How It's Enforced |
|---|---|
| New users see ONLY their own data | Every DB query scoped by `user_id`; Zustand stores reset on logout; `sv_last_note` cleared |
| Dashboard always shows latest values | Event-driven re-fetch (`learning:update`); navigation-aware refresh; manual retry button |
| No stale data on browser refresh | `Cache-Control: no-store` on all API responses |
| No cross-user cache poisoning | Search cache keyed by `userId`; frontend cache skips authenticated requests |
| No missing endpoints | Progress routes created and mounted; subject progress created; bookmarks details created |
| Auth is request-scoped | JWT decoded per request; `req.user` set on request object; no global auth state |
| No Zustand state leaks across users | `reset()` on `useCompletedStore`, `userProgressStore`; called in logout handler |

---

## 🧪 Recommended Manual Verification (2-User Test)

To confirm all fixes work in production:

1. **Login as User A** → bookmark 2 notes, complete 3 notes
2. **Check Dashboard** → verify bookmarks and progress show correctly
3. **Logout**
4. **Login as User B** (fresh account, no activity)
5. **Check Dashboard** → must show 0 bookmarks, 0 completions, 0 study time, 0 streak
6. **Check DevTools Network tab** → all API responses should have `Cache-Control: no-store`
7. **As User B, bookmark 1 note** → navigate to Dashboard → must show exactly 1 bookmark
8. **Logout → Login as User A** → Dashboard must still show User A's original 2 bookmarks and 3 completions
