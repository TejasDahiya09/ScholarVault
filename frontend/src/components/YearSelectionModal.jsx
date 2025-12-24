import React, { useState } from 'react';
import client from '../api/client';

export default function YearSelectionModal({ onYearSelected }) {
  const [selectedYear, setSelectedYear] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelectYear = async () => {
    if (!selectedYear) return;
    
    setLoading(true);
    try {
      await client.put('/api/auth/year', { year: selectedYear });
      onYearSelected(selectedYear);
    } catch (err) {
      console.error('Failed to update year:', err);
      alert('Failed to save year selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 md:p-8 animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">🎓</div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome to ScholarVault!</h2>
          <p className="text-sm sm:text-base text-gray-600">Select your current semester to get started</p>
        </div>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {/* 1st Year Option */}
          <button
            onClick={() => setSelectedYear('1st Year')}
            className={`w-full p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left ${
              selectedYear === '1st Year'
                ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">1st Year</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Semester 1 & 2</p>
              </div>
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedYear === '1st Year'
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedYear === '1st Year' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* 2nd Year Option */}
          <button
            onClick={() => setSelectedYear('2nd Year')}
            className={`w-full p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left ${
              selectedYear === '2nd Year'
                ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">2nd Year</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Semester 3 & 4</p>
              </div>
              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedYear === '2nd Year'
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedYear === '2nd Year' && (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Coming Soon Banner for Year 3 & 4 */}
          <div className="p-4 sm:p-5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl sm:text-3xl">🚀</span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-1">Year 3 & 4 Coming Soon!</h3>
                <p className="text-xs sm:text-sm text-amber-700">We're working on adding content for 3rd and 4th year. Stay tuned!</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSelectYear}
          disabled={!selectedYear || loading}
          className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base transition-all duration-200 ${
            selectedYear && !loading
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4 sm:mt-6">
          You can change this later in your profile settings
        </p>
      </div>
    </div>
  );
}
