# ScholarVault Dashboard Analysis

## CURRENT DASHBOARD DATA FLOW

### Data Sources
- **Study Time, Units Completed, Study Streak, Weekly Activity**: Fetched from `/api/progress/analytics` via `client` (Axios wrapper with JWT and cache). Single source of truth from backend analytics.
- **Saved for Learning (Bookmarks)**: Fetched from `bookmarksAPI.getBookmarksWithDetails()` (calls `/api/bookmarks`).
- **My Subjects Progress**: Subjects fetched from `/api/subjects`, then per-subject progress from `/api/subjects/:id/progress`.
- **Recent Activity**: Read from `localStorage` (`sv_last_note`).
- **Next Unit to Study**: Derived from subjects with progress < 100%, then fetches units for that subject.

### Data Flow
- All data is fetched in `fetchDashboardData()` (called on mount, on `user.selected_year` change, and on `learning:update` event).
- Bookmarks and subjects are fetched first, then subject progress is loaded asynchronously for each subject.
- Analytics (study time, units completed, streak) is fetched once per dashboard load.
- Weekly activity is set from analytics or fallback to empty if error.
- Bookmarks and subjects are paginated in local state.
- No polling; all fetches are on mount or explicit refresh.
- Some data (bookmarks, subjects) is cached by Axios client for up to 10 minutes, except live progress endpoints.

### State Management
- **Local React State**: `loading`, `error`, `stats`, `subjects`, `weeklyActivity`, `recentActivity`, `nextUnit`, `bookmarkedNotes`, `bookmarksPage`, `subjectsPage`.
- **Zustand Stores**: `useAuth` (user, token), `useCompletedStore` (not directly used in Dashboard, but available for completed notes).
- **Derived Values**: `paginatedBookmarks`, `paginatedSubjects`, `needsAttention` (subjects with low progress).
- **No duplicated state** in Dashboard, but subject progress is loaded after initial subject fetch (may cause UI lag).

## WHAT IS CORRECT
- Analytics stats (study time, units completed, streak) are always fetched from backend, not recomputed locally.
- Bookmarks are fetched from backend, not hardcoded.
- Subject progress is fetched per subject, not derived locally.
- Data is refreshed on mount, year change, and learning updates.
- Pagination is handled in local state, not backend.

## WHAT IS INCORRECT / STALE
- **Subject progress**: Initially set to -1, then updated asynchronously. UI may show stale or partial progress until all fetches complete.
- **Recent Activity**: Only reads from localStorage, does not update if user marks a note complete/bookmarks a note elsewhere.
- **Next Unit**: Only updates on dashboard load, not after marking complete/bookmarking.
- **Bookmarks**: If bookmark is added/removed elsewhere, may not update until dashboard reload or `learning:update` event.
- **Weekly Activity fallback**: If analytics fetch fails, fallback is hardcoded to zeroes for all days.

## WHAT SHOULD BE REMOVED
- Any hardcoded fallback for weekly activity (should be handled by backend or show error).
- Unused imports (if any, e.g. `useCompletedStore` if not used).
- Any logic that sets subject progress locally (should only use backend value).

## WHAT SHOULD BE FIXED (HIGH LEVEL ONLY)
- Ensure subject progress and bookmarks always reflect backend state after any action (bookmark, mark complete).
- Remove any local recomputation of analytics or progress.
- Make recent activity update after marking complete/bookmarking.
- Remove hardcoded fallback data for weekly activity.
- Clean up unused imports and dead code.

## WHAT SHOULD NOT BE TOUCHED
- UI components, styles, layout, and pagination logic.
- Backend API endpoints and their contract.
- Zustand store logic unless directly related to dashboard data flow.
- Any code outside Dashboard page and its direct dependencies.
