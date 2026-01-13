# DASHBOARD_NAVIGATION_AUDIT.md

## 1. ROUTE STRUCTURE
- Dashboard is rendered via a `<Route path="/dashboard">` in App.jsx.
- It is wrapped in a persistent layout component: `<AppShell>`.
- `<AppShell>` is always mounted for all main app routes (dashboard, home, search, books, progress, profile, notes).
- Dashboard is a direct child of AppShell for the /dashboard route.
- There is no evidence of a nested layout or dynamic keying that would force unmount/remount on navigation.

## 2. NAVIGATION BEHAVIOR
- When navigating away from Dashboard (e.g., to /home or /search) and back, AppShell remains mounted.
- Dashboard component is unmounted only if the route changes to a non-AppShell route (e.g., /login, /register, /).
- For navigation between /dashboard, /home, /search, etc., AppShell persists and only the child page component changes.
- Dashboard is remounted only if the route leaves AppShell and returns, or if the router is reset.

## 3. LIFECYCLE CONFIRMATION
- Dashboard unmounts only if the route leaves the AppShell context (e.g., to /login or /register).
- No keys are used on the <Route> or <AppShell> that would force a remount on navigation.
- <Outlet> is not used in AppShell; children are rendered directly.
- Therefore, navigation between main app pages does NOT guarantee Dashboard unmount/remount.

## 4. REFRESH OPPORTUNITIES (NO FIXES)
- The only signals available on navigation are:
  - `location.pathname` (from react-router)
  - Route params (not used for /dashboard)
  - No explicit navigation events or listeners are present.
- Dashboard cannot detect re-entry today unless it is remounted or its useEffect dependency (`user?.selected_year`) changes.
- There is no effect or hook watching for location changes or navigation events in Dashboard.jsx or AppShell.jsx.

## 5. CONCLUSION
- `fetchDashboardData` does NOT run on navigation back to Dashboard because:
  - The Dashboard component is NOT remounted when navigating between main app pages (e.g., /home → /dashboard).
  - The useEffect in Dashboard.jsx only depends on `user?.selected_year`, not on route or navigation events.
  - There is no key or forced remount on the <Route> or <AppShell>.
  - As a result, returning to Dashboard via SPA navigation does NOT trigger a data refresh unless the component is remounted or `selected_year` changes.

---

**END OF AUDIT**
