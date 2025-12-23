import React, { useState } from 'react';
import client from '../api/client';
import useAuth from '../store/useAuth';

export default function OnboardingModal({ open, onClose }) {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(user?.selected_year || '1st Year');
  const [studyGoal, setStudyGoal] = useState(user?.study_goal || 'exam-prep');
  const [notifications, setNotifications] = useState(user?.notifications_enabled !== false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Save preferences to backend
      await client.put('/api/auth/preferences', {
        selected_year: year,
        study_goal: studyGoal,
        notifications_enabled: notifications,
      });

      // Update auth store
      const updatedUser = { ...user, selected_year: year, study_goal: studyGoal, notifications_enabled: notifications };
      login(localStorage.getItem('sv_token'), updatedUser);
      
      // Close modal
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 bg-gradient-to-br from-white via-indigo-50 to-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-indigo-100 overflow-y-auto max-h-screen">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-600">Let's personalize your learning journey</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Academic Year Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Your Year
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((y) => (
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
            </div>
          </div>

          {/* Study Goal Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Your Study Goal
            </label>
            <div className="space-y-2">
              {[
                { value: 'exam-prep', label: '📚 Exam Preparation', desc: 'Focus on exams & assessments' },
                { value: 'deep-learning', label: '🔬 Deep Learning', desc: 'Understand concepts thoroughly' },
                { value: 'revision', label: '⚡ Quick Revision', desc: 'Quick notes & summaries' },
              ].map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setStudyGoal(goal.value)}
                  disabled={loading}
                  className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                    studyGoal === goal.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium text-sm text-gray-900">{goal.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📬 Notifications
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setNotifications(true)}
                disabled={loading}
                className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                  notifications
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <div className="font-medium text-sm text-gray-900">✅ Enable</div>
                <div className="text-xs text-gray-600 mt-0.5">Get daily reminders & study tips</div>
              </button>
              <button
                onClick={() => setNotifications(false)}
                disabled={loading}
                className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                  !notifications
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <div className="font-medium text-sm text-gray-900">🔇 Disable</div>
                <div className="text-xs text-gray-600 mt-0.5">Study without interruptions</div>
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-6">
            <p className="text-xs sm:text-sm text-indigo-900">
              💡 <span className="font-semibold">Tip:</span> You can always change these settings in your Profile.
            </p>
          </div>
        </div>

        {/* Actions */}
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

        {/* Current Selection Display */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Selected: <span className="font-semibold text-gray-700">{year}</span> • <span className="font-semibold text-gray-700">{studyGoal === 'exam-prep' ? 'Exam Prep' : studyGoal === 'deep-learning' ? 'Deep Learning' : 'Quick Revision'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
