import React from "react";
import Sidebar from "./Sidebar";
import { useState } from "react";

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
