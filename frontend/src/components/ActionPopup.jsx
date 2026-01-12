// ActionPopup.jsx
import React from 'react';
import { CheckCircleIcon, XCircleIcon, StarIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';



const popupConfig = {
  'bookmark-add': {
    icon: <StarIcon className="h-16 w-16 text-yellow-400 drop-shadow-lg" />, // filled star
    title: 'Saved!',
    subtitle: 'This note has been saved for future learning',
    desc: 'You can access it anytime from your bookmarks',
  },
  'bookmark-remove': {
    icon: <StarIcon className="h-16 w-16 text-gray-300 drop-shadow-lg" />, // filled gray star
    title: 'Removed!',
    subtitle: 'This note has been removed from your bookmarks',
    desc: '',
  },
  'complete': {
    icon: <CheckCircleIcon className="h-16 w-16 text-green-500 drop-shadow-lg" />, // filled check
    title: 'Completed!',
    subtitle: 'Marked as done and tracked in your progress',
    desc: 'You can revisit or unmark anytime',
  },
  'incomplete': {
    icon: <XCircleIcon className="h-16 w-16 text-red-400 drop-shadow-lg" />, // filled x
    title: 'Marked as Incomplete',
    subtitle: 'This note is no longer marked as complete',
    desc: '',
  },
};

export default function ActionPopup({ type, onClose }) {
  const config = popupConfig[type] || popupConfig['bookmark-add'];
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl px-10 py-10 flex flex-col items-center animate-popup transition-all duration-500 min-w-[340px] max-w-[90vw]">
        {config.icon}
        <h2 className="mt-6 text-3xl font-bold text-gray-800">{config.title}</h2>
        {config.subtitle && <div className="mt-2 text-base font-medium text-gray-700 text-center">{config.subtitle}</div>}
        {config.desc && <div className="mt-1 text-sm text-gray-500 text-center">{config.desc}</div>}
        <button
          onClick={onClose}
          className="mt-8 flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-300 text-base font-medium"
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
