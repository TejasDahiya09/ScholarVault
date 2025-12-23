import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import OnboardingModal from "../OnboardingModal";
import useAuth from "../../store/useAuth";
import { useState } from "react";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, token } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(!user?.selected_year);

  // Session lifecycle: start when app mounts, end on unload
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL;

    const start = async () => {
      if (!token) return;
      try {
        await fetch(`${API_BASE}/api/progress/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ startedAt: new Date().toISOString() }),
        });
      } catch {}
    };

    const end = async () => {
      const tk = localStorage.getItem('sv_token');
      if (!tk) return;
      try {
        await fetch(`${API_BASE}/api/progress/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tk}` },
          body: JSON.stringify({ endedAt: new Date().toISOString() }),
        });
      } catch {}
    };

    start();
    const onUnload = () => { end(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') end();
    });
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [token]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Onboarding Modal */}
      <OnboardingModal 
        open={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h1 className="text-lg font-semibold text-gray-900">ScholarVault</h1>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
