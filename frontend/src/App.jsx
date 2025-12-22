import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";

// Auth
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Layout
import AppShell from "./components/Layout/AppShell";

// AppShell pages
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BooksPage from "./pages/BooksPage";
import ProgressPage from "./pages/ProgressPage";
import ProfilePage from "./pages/ProfilePage";
import NotesPage from "./pages/Notes/NotesPage";

export default function App() {
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
              <Dashboard />
            </AppShell>
          }
        />

        <Route
          path="/home"
          element={
            <AppShell>
              <HomePage />
            </AppShell>
          }
        />

        <Route
          path="/search"
          element={
            <AppShell>
              <SearchPage />
            </AppShell>
          }
        />

        <Route
          path="/books"
          element={
            <AppShell>
              <BooksPage />
            </AppShell>
          }
        />

        <Route
          path="/progress"
          element={
            <AppShell>
              <ProgressPage />
            </AppShell>
          }
        />

        <Route
          path="/profile"
          element={
            <AppShell>
              <ProfilePage />
            </AppShell>
          }
        />

        <Route
          path="/notes"
          element={
            <AppShell>
              <NotesPage />
            </AppShell>
          }
        />

      </Routes>
  );
}
