import React from "react";
import { Link } from "react-router-dom";
import DarkModeToggle from "../DarkModeToggle";

export default function NavBar() {
  return (
    <nav className="w-full bg-white/70 backdrop-blur-xl shadow-sm border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3 sm:py-4 lg:py-5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-xl sm:text-2xl">
            ⚡
          </div>
          <span className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
            ScholarVault
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8 flex-1 ml-2 sm:ml-4 lg:ml-8">
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 lg:gap-4 ml-auto">
            <Link 
              to="/login" 
              className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm lg:text-base font-medium text-slate-700 hover:text-indigo-600 transition-all duration-200 rounded-lg hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link 
              to="/register" 
              className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 text-xs sm:text-sm lg:text-base bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
          {/* Mobile: Show only Get Started button */}
          <Link 
            to="/register" 
            className="sm:hidden ml-auto px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-all duration-200 shadow-md"
          >
            Get Started
          </Link>
          <DarkModeToggle variant="compact" />
        </div>
      </div>
    </nav>
  );
}
