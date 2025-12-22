import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

import Landing from "./pages/Landing";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Auth
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Layout
import AppShell from "./components/Layout/AppShell";

// AppShell pages
// AppShell pages - lazy loaded for route-level code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotesPage = lazy(() => import("./pages/Notes/NotesPage"));

// Simple fallback loader
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  // Warm the backend to reduce perceived cold-start latency on free tiers
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/healthz`).catch(() => {});
  }, []);

  return (
    <Routes>

        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* AppShell protected routes */}
        <Route
          path="/dashboard"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/home"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <SubjectsPage />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/search"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <SearchPage />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/books"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <BooksPage />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/progress"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <ProgressPage />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/profile"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <ProfilePage />
            </Suspense>
            </AppShell>
          }
        />

        <Route
          path="/notes"
          element={
            <AppShell>
            <Suspense fallback={<PageLoader />}>
              <NotesPage />
            </Suspense>
            </AppShell>
          }
        />

      </Routes>
  );
}
