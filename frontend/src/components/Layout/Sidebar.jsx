// src/components/Layout/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import DarkModeToggle from "../DarkModeToggle";

export default function Sidebar({ isOpen = true, onClose }) {
  const navigate = useNavigate();

  const items = [
    { name: "Subjects", to: "/home", icon: "🏠" },
    { name: "Dashboard", to: "/dashboard", icon: "📊" },
    // Notes removed intentionally — notes open from Home via unit selection
    { name: "Search", to: "/search", icon: "🔍" },
    { name: "Progress", to: "/progress", icon: "📈" },
    { name: "Profile", to: "/profile", icon: "👤" },
  ];

  function handleLogout() {
    localStorage.removeItem("sv_token");
    localStorage.removeItem("sv_user");
    // After logout, go to landing page (/) by default
    navigate("/");
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 bottom-0 z-50
        w-64 h-screen bg-white border-r border-gray-200 
        flex flex-col py-4 sm:py-6 px-3 sm:px-4
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-10 px-2 cursor-pointer" onClick={() => { navigate("/home"); onClose?.(); }}>
          <div className="text-xl sm:text-2xl">⚡</div>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">
            ScholarVault
          </h1>
        </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 sm:space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 group relative
               ${isActive 
                 ? "bg-gray-100 text-gray-900" 
                 : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-base sm:text-lg">{item.icon}</span>
                <span className="truncate">{item.name}</span>
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900 rounded-r" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="mt-auto space-y-2">
        {/* Dark Mode Toggle */}
        <DarkModeToggle />
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium transition-all duration-200 group text-xs sm:text-sm"
        >
          <span className="text-base sm:text-lg">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
