import React from 'react';
import useDarkMode from '../store/useDarkMode';

export default function DarkModeToggle({ variant = 'default' }) {
  const { darkMode, toggleDarkMode } = useDarkMode();

  if (variant === 'compact') {
    // Compact version for top navigation
    return (
      <button
        onClick={toggleDarkMode}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white/80 backdrop-blur-sm rounded-lg hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md border border-slate-200"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span className={`text-base sm:text-lg transition-transform duration-500 ${darkMode ? 'rotate-180' : ''}`}>
          {darkMode ? '☀️' : '🌙'}
        </span>
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-700">
          {darkMode ? 'Light' : 'Dark'}
        </span>
      </button>
    );
  }

  // Default full version for sidebar
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-2">
        <span className={`text-lg transition-transform duration-500 ${darkMode ? 'rotate-180' : ''}`}>
          {darkMode ? '☀️' : '🌙'}
        </span>
        <span className="text-sm font-medium text-gray-700">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={darkMode}
          onChange={toggleDarkMode}
        />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition-all duration-500"></div>
        <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-all duration-500 peer-checked:translate-x-5"></div>
      </label>
    </div>
  );
}
