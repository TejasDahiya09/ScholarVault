import React, { useState } from 'react';
import client from '../api/client';
import useAuth from '../store/useAuth';
import useDarkMode from '../store/useDarkMode';

export default function OnboardingModal({ open, onClose }) {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(user?.selected_year || '1st Year');
  const { darkMode, setDarkMode } = useDarkMode();
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');

      await client.put('/api/auth/preferences', { selected_year: year });

      const updatedUser = { ...user, selected_year: year };
      login(localStorage.getItem('sv_token'), updatedUser);

      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-50 bg-gradient-to-br from-white via-indigo-50 to-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-indigo-100 overflow-y-auto max-h-screen">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600">Let's personalize your learning journey</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Your Year</label>
            <div className="grid grid-cols-2 gap-3">
              {['1st Year', '2nd Year'].map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  disabled={loading}
                  className={`py-3 px-4 rounded-xl border-2 font-medium transition-all duration-200 text-sm ${
                    year === y
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {y}
                </button>
              ))}
              {/* Coming Soon buttons for Year 3 & 4 */}
              {['3rd Year', '4th Year'].map((y) => (
                <div
                  key={y}
                  className="relative py-3 px-4 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-400 font-medium text-sm cursor-not-allowed opacity-60"
                >
                  <span className="block">{y}</span>
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md">Soon</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-600">You can change your year anytime from Profile &gt; Preferences.</p>
            
            {/* Coming Soon Banner */}
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-base">🚀</span>
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Year 3 & 4 coming soon!</span> We're working on adding content for these years.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Theme</label>
            <div className="flex items-center justify-between rounded-xl border-2 border-gray-200 px-4 py-3 bg-white/60">
              <div>
                <div className="font-medium text-sm text-gray-900">{darkMode ? 'Dark Mode' : 'Light Mode'}</div>
                <div className="text-xs text-gray-600 mt-0.5">Toggle the app theme</div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-300'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    darkMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-6">
            <p className="text-xs sm:text-sm text-indigo-900">
              💡 <span className="font-semibold">Tip:</span> You can always change these settings in your Profile.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Selected: <span className="font-semibold text-gray-700">{year}</span> • <span className="font-semibold text-gray-700">{darkMode ? 'Dark' : 'Light'} Theme</span>
          </p>
        </div>
      </div>
    </div>
  );
}
