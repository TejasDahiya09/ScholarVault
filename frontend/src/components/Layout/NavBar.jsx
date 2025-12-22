import React from "react";
import { Link } from "react-router-dom";
import DarkModeToggle from "../DarkModeToggle";

export default function NavBar() {
  return (
    <nav className="w-full bg-white/70 backdrop-blur-xl shadow-sm border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            ⚡
          </div>
          <span className="text-xl font-semibold text-gray-900">
            ScholarVault
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="px-5 py-2.5 font-medium text-slate-700 hover:text-indigo-600 transition-all duration-200 rounded-lg hover:bg-slate-50"
          >
            Sign in
          </Link>
          <Link 
            to="/register" 
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
