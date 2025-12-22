import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// ===== PERFORMANCE ARCHITECTURE =====
// Rule: Public routes load immediately, app routes lazy load
// Benefits: Fast initial load, code splitting, better caching

// Public routes (immediate load - small bundle)
import Landing from "./pages/Landing";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Layout (always loaded - app shell pattern)
import AppShell from "./components/Layout/AppShell";

// Protected routes (lazy loaded - code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotesPage = lazy(() => import("./pages/Notes/NotesPage"));

// Loading fallback component (skeleton UI)
function PageSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="space-y-3 mt-8">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes - immediate load */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes - lazy loaded with suspense */}
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <Dashboard />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/home"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <HomePage />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/search"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <SearchPage />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/books"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <BooksPage />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/progress"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <ProgressPage />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/profile"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <ProfilePage />
              </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/notes"
          element={
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <NotesPage />
              </Suspense>
            </AppShell>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
