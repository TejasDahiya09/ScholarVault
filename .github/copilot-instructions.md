# ScholarVault – Copilot Instructions

## Project Overview

ScholarVault is an educational platform with:

* **Frontend:** React + Vite + TailwindCSS + Zustand
* **Backend:** Express.js + Supabase + AWS S3 + Google Vertex AI
* **Database:** PostgreSQL (via Supabase)

The application consists of multiple synchronized pages:

* Dashboard
* NotesPage
* ProgressPage

All user actions (bookmarks, completed notes, progress) must remain consistent across pages without requiring refresh.

---

## 🔒 NON-NEGOTIABLE ENGINEERING RULES

### 1. Authentication & Authorization

* ALL protected routes MUST use `authenticate` middleware
* ALL user-specific queries MUST filter by `userId`
* NEVER expose data without ownership checks

```js
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

---

### 2. Data Integrity & Async Safety

```js
// ❌ NEVER do this
items.forEach(async (item) => {
  await processItem(item);
});

// ✅ DO this
await Promise.all(items.map(item => processItem(item)));

// OR sequential when required
for (const item of items) {
  await processItem(item);
}
```

---

### 3. Cache Management (Backend)

* ALL mutations MUST invalidate related cache
* Progress endpoints MUST NOT be cached
* Always call `invalidateCache()` after writes

---

### 4. Error Handling (Mandatory)

```js
try {
  const result = await apiCall();
  return result;
} catch (err) {
  console.error("Context:", err);
  throw new Error("Something went wrong. Please try again.");
}
```

User-facing errors must always be friendly and actionable.

---

### 5. Database Queries

```js
// ❌ Avoid
.select("*")

// ✅ Always specify columns
.select("id, title, created_at")
```

---

### 6. Production Hygiene

* ❌ No `console.log`
* ❌ No `TODO` / `FIXME`
* ❌ No commented-out code
* ✅ Clean commits only

---

## 🧠 FRONTEND STATE MANAGEMENT (CRITICAL)

### ✅ Zustand is the Single Source of Truth

Zustand is mandatory for **cross-page state** such as:

* Completed notes
* Progress indicators
* Cached per-subject data

🚨 **Components MUST NOT use local `useState` for authoritative data.**

---

### ❌ Forbidden Patterns

* Storing completion state in component `useState`
* Refetching completed notes on every subject change
* Using `window.dispatchEvent` or manual sync hacks
* Maintaining isolated state per page

---

### ✅ Required Zustand Pattern

All completion logic MUST live in:

```
frontend/src/store/
```

Store responsibilities:

* Cache data per subject
* Expose selectors (not raw state)
* Handle optimistic updates
* Roll back on API failure
* Prevent duplicate API calls

```ts
completedNoteIds.has(noteId)
```

UI must always derive state from the store.

---

## 🔁 SUBJECT CHANGE RULES

* Subject changes MUST NOT wipe state
* Zustand cache must restore state instantly
* API calls should occur ONLY if cache is missing
* Navigation must never require refresh

---

## 🔖 BOOKMARKS & COMPLETED NOTES (ARCHITECTURAL RULE)

Bookmarks and Completed Notes MUST:

* Follow the SAME architectural pattern
* Use global Zustand state
* Persist across navigation
* Update Dashboard & ProgressPage instantly

🚨 **Any change that breaks bookmarks is invalid.**

---

## ⚡ OPTIMISTIC UI (MANDATORY)

```js
const previous = getState();
setState(optimistic);

try {
  await apiCall();
} catch {
  setState(previous);
  toast.error("Update failed");
}
```

---

## 📁 FILE STRUCTURE (ENFORCED)

```
backend/src/routes/        → Express routes
backend/src/controllers/  → Request handlers
backend/src/services/     → Business logic
backend/src/db/           → DB access

frontend/src/pages/       → Pages (NO business logic)
frontend/src/components/  → Reusable UI
frontend/src/api/         → API client (JWT auto-attached)
frontend/src/store/       → Zustand stores (source of truth)
```

---

## 🔐 FRONTEND API CALL PATTERN

```js
// client.js auto-injects JWT
const { data } = await client.get("/api/resource");
```

Never manually attach tokens.

---

## 🧪 ACCEPTANCE CRITERIA (MUST PASS)

✔ Completed state persists across subject change
✔ Removing completion persists
✔ Dashboard updates instantly
✔ ProgressPage updates instantly
✔ No page refresh required
✔ No duplicate API calls
✔ No race conditions
✔ No regression in bookmarks

---

## 🧩 PERFORMANCE & UX REQUIREMENTS

* Cache completed notes per subject
* Avoid unnecessary re-fetching
* Instant UI response on navigation
* Predictable, deterministic state

---

## 🧪 LOCAL TESTING

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run dev
```

---

## 🏁 FINAL RULE (ABSOLUTE)

If a solution:

* Breaks bookmarks
* Uses local state for authoritative data
* Requires refresh to sync pages

❌ **IT IS WRONG — DO NOT IMPLEMENT**
