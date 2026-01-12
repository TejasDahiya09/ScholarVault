// ActionPopup.jsx
import React from 'react';
import { CheckCircleIcon, BookmarkIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ActionPopup({ type, onClose }) {
  // type: 'bookmark' | 'complete'
  const icon = type === 'bookmark' ? <BookmarkIcon className="h-12 w-12 text-blue-500" /> : <CheckCircleIcon className="h-12 w-12 text-green-500" />;
  const message = type === 'bookmark' ? 'Bookmarked!' : 'Marked as Complete!';
  const lineColor = type === 'bookmark' ? 'border-blue-300' : 'border-green-300';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center animate-popup transition-all duration-500">
        <div className={`w-full border-t-4 ${lineColor} mb-4`} />
        {icon}
        <h2 className="mt-4 text-xl font-semibold text-gray-800">{message}</h2>
        <p className="mt-2 text-gray-500">Your action was successful.</p>
        <button
          onClick={onClose}
          className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-300"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
          Close
        </button>
      </div>
    </div>
  );
}

// Add this to your global CSS (e.g., index.css) for animation:
// @keyframes popup {
//   0% { transform: scale(0.8); opacity: 0; }
//   100% { transform: scale(1); opacity: 1; }
// }
// .animate-popup {
//   animation: popup 0.4s cubic-bezier(0.4, 0, 0.2, 1);
// }
