// ActionPopup.jsx
import React from 'react';
import { CheckCircleIcon, BookmarkIcon, XMarkIcon, XCircleIcon, StarIcon } from '@heroicons/react/24/outline';


// type: 'bookmark-add' | 'bookmark-remove' | 'complete' | 'incomplete'
const popupConfig = {
  'bookmark-add': {
    icon: <StarIcon className="h-14 w-14 text-yellow-400" />,
    title: 'Saved!',
    desc: 'This note has been saved for future learning. You can access it anytime from your bookmarks.',
    border: 'border-yellow-300',
  },
  'bookmark-remove': {
    icon: <StarIcon className="h-14 w-14 text-gray-300" />,
    title: 'Removed!',
    desc: 'This note has been removed from your bookmarks.',
    border: 'border-gray-300',
  },
  'complete': {
    icon: <CheckCircleIcon className="h-14 w-14 text-green-500" />,
    title: 'Completed!',
    desc: 'Marked as done and tracked in your progress. You can revisit or unmark anytime.',
    border: 'border-green-300',
  },
  'incomplete': {
    icon: <XCircleIcon className="h-14 w-14 text-red-400" />,
    title: 'Marked as Incomplete',
    desc: 'This note is no longer marked as complete.',
    border: 'border-red-200',
  },
};

export default function ActionPopup({ type, onClose }) {
  const config = popupConfig[type] || popupConfig['bookmark-add'];
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center animate-popup transition-all duration-500 min-w-[320px] max-w-[90vw]">
        <div className={`w-full border-t-4 ${config.border} mb-4`} />
        {config.icon}
        <h2 className="mt-4 text-2xl font-bold text-gray-800">{config.title}</h2>
        <p className="mt-2 text-gray-500 text-center max-w-xs">{config.desc}</p>
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
