// ActionPopup.jsx
import React from 'react';

const popupConfig = {
  'bookmark-add': {
    icon: '⭐️',
    title: 'Saved!',
    subtitle: 'This note has been saved for future learning',
    desc: 'You can access it anytime from your bookmarks',
  },
  'bookmark-remove': {
    icon: '⭐️',
    title: 'Removed!',
    subtitle: 'This note has been removed from your bookmarks',
    desc: '',
  },
  'complete': {
    icon: '✅',
    title: 'Completed!',
    subtitle: 'Marked as done and tracked in your progress',
    desc: 'You can revisit or unmark anytime',
  },
  'incomplete': {
    icon: '❌',
    title: 'Marked as Incomplete',
    subtitle: 'This note is no longer marked as complete',
    desc: '',
  },
};


export default function ActionPopup({ type }) {
  const config = popupConfig[type] || popupConfig['bookmark-add'];
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{background: 'rgba(0,0,0,0.04)', transition: 'background 0.3s'}}>
      <div
        className="popup-animate bg-white rounded-2xl px-5 py-5 flex flex-col items-center"
        style={{
          minWidth: 240,
          maxWidth: 290,
          boxShadow: '0 8px 40px 0 rgba(0,0,0,0.16), 0 1.5px 6px 0 rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.3s, transform 0.3s',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8, transition: 'transform 0.3s' }}>{config.icon}</div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-1" style={{lineHeight:1.1, transition: 'color 0.3s'}}>{config.title}</h2>
        {config.subtitle && (
          <div className="text-[0.97rem] font-medium text-gray-600 text-center mb-0.5" style={{lineHeight:1.35, transition: 'color 0.3s', paddingLeft: 2, paddingRight: 2 }}>{config.subtitle}</div>
        )}
        {config.desc && (
          <div className="text-xs text-gray-400 text-center mt-0.5" style={{lineHeight:1.3, transition: 'color 0.3s', paddingLeft: 2, paddingRight: 2 }}>{config.desc}</div>
        )}
      </div>
      <style>{`
        .popup-animate {
          animation: popup-fade-in 0.45s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes popup-fade-in {
          0% { opacity: 0; transform: scale(0.85) translateY(40px); }
          60% { opacity: 1; transform: scale(1.04) translateY(-6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
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
