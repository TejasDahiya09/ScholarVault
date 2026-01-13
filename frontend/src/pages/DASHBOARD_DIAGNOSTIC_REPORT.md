# DASHBOARD_DIAGNOSTIC_REPORT.md

## 1. DASHBOARD DATA FLOW
- Dashboard fetches data on mount and whenever `user?.selected_year` changes (via useEffect dependency).
- The refresh is triggered by the `doRefresh` function, which calls `fetchDashboardData()`.
- There is also a manual refresh via the Retry button if an error occurs.
- No other triggers (no event-based, no Zustand subscriptions, no window events).
- Data is NOT refreshed on every navigation unless the component is remounted or `selected_year` changes.
- If user navigates away and returns without a remount, data may not refresh.

## 2. API CALL TRACE
- **/api/bookmarks**: Called in `fetchDashboardData` via `bookmarksAPI.getBookmarksWithDetails()`. No parameters. Uses JWT for user context. Not cached for live progress endpoints.
- **/api/subjects**: Called in `fetchDashboardData` to get all subjects. No parameters. Uses JWT. May be cached unless invalidated.
- **/api/subjects/:id/progress**: Called for each subject in batch. Not cached (live endpoint). Uses JWT.
- **/api/progress/analytics**: Called in `fetchDashboardData` for analytics. Not cached (live endpoint). Uses JWT.
- Caching is handled in `client.js`. All /progress endpoints are always fetched fresh (not cached). Other GETs may be cached for 10 minutes unless invalidated by a mutation.
- Stale responses are possible for endpoints that are cached and not invalidated by a related mutation.

## 3. STATE LIFECYCLE ANALYSIS
- State variables: `stats`, `subjects`, `weeklyActivity`, `recentActivity`, `nextUnit`, `bookmarkedNotes`, `loading`, `error`, `bookmarksPage`, `subjectsPage`.
- All displayed values are controlled by these state variables.
- Pagination (`bookmarksPage`, `subjectsPage`) and memoization (`useMemo`) can hide updates if the underlying array is not refreshed.
- If `fetchDashboardData` is not called (e.g., on navigation without remount), state can remain stale.
- There is no automatic refresh on every navigation; only on mount or year change.

## 4. AUTH & USER CONTEXT CHECK
- User identity is obtained from `useAuth` (Zustand store), which reads from localStorage on initialization.
- JWT is attached to all API requests via `client.js` interceptor.
- Dashboard can render before user is ready if localStorage is empty or not yet set, but this is rare due to synchronous localStorage access.
- `selected_year` is a dependency for the main useEffect and triggers a refresh when changed.

## 5. REPRODUCTION PATH
1. Mark a unit as complete (in Notes page or elsewhere).
2. Navigate away from Dashboard (e.g., to Subjects or Search).
3. Return to Dashboard (via navigation, not full reload).
4. **Expected:** Dashboard should show updated progress, analytics, and bookmarks.
5. **Actual:** Dashboard may NOT update unless the component is remounted or `selected_year` changes. Data can remain stale.
6. The chain breaks because there is no trigger to call `fetchDashboardData` on navigation back to Dashboard if the component is not remounted.

## 6. EXPLICIT NON-ISSUES
- Bookmarks backend is NOT broken.
- Completions backend is NOT broken.
- Dashboard UI layout is NOT broken.
- Database isolation is NOT the root cause.

## 7. ROOT CAUSE HYPOTHESES (NO FIXES)
- Missing refresh trigger on navigation back to Dashboard (component not remounted, so useEffect does not run).
- Cached response reuse for endpoints that are not live (e.g., /api/subjects if not invalidated).
- Effect dependency gaps: only `selected_year` triggers refresh, not navigation or other state changes.
- Navigation behavior: SPA navigation does not remount Dashboard, so no data refresh.
- Race conditions: UNCLEAR (no evidence in current code, but possible if multiple async fetches overlap).

---

**END OF REPORT**
