import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import client from "../api/client";
import useAuth from "../store/useAuth";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [pendingSubject, setPendingSubject] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch all subjects
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function fetchSubjects() {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);
        const res = await client.get('/api/subjects', {
          signal: abortController.signal
        });
        if (isMounted) {
          setAllSubjects(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Failed to fetch subjects:", err);
        if (isMounted) {
          setError("Failed to load subjects. Please try again.");
          setAllSubjects([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchSubjects();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [refreshTrigger]);

  // Filter subjects by user's selected year
  const filteredSubjects = useMemo(() => {
    if (!user?.selected_year) return [];
    
    const yearToSemesters = {
      '1st Year': ['1', '2', '1st year'],
      '2nd Year': ['3', '4', '2nd year'],
      '3rd Year': ['5', '6', '3rd year'],
      '4th Year': ['7', '8', '4th year']
    };
    
    const validSemesters = (yearToSemesters[user.selected_year] || [])
      .map(s => String(s).trim().toLowerCase());
    
    return allSubjects.filter(s => 
      validSemesters.includes(String(s.semester || '').trim().toLowerCase())
    );
  }, [allSubjects, user?.selected_year]);

  // Breadcrumbs
  const crumbs = [
    { label: "Subjects" }
  ];

  // Handle subject click
  const handleSubjectClick = useCallback((subject) => {
    const seen = localStorage.getItem('sv_subject_tips_seen') === '1';
    if (!seen) {
      setPendingSubject(subject);
      setShowTips(true);
      return;
    }
    navigate(`/notes?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&branch=${encodeURIComponent(subject.branch || '')}&semester=${encodeURIComponent(subject.semester || '')}`);
  }, [navigate]);

  if (!user?.selected_year) {
    return (
      <div className="min-h-screen py-4 xs:py-6 sm:py-8 safe-top safe-bottom">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 xs:mt-8 text-center py-8 xs:py-12 bg-white rounded-lg xs:rounded-xl shadow-lg px-4 xs:px-6">
            <div className="text-4xl xs:text-5xl sm:text-6xl mb-4">📚</div>
            <p className="text-fluid-lg sm:text-fluid-xl font-semibold text-gray-900 mb-2">Select Your Year</p>
            <p className="text-fluid-sm xs:text-fluid-base text-gray-600 mb-6">
              Please select your academic year in your Profile to see subjects.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="min-h-touch px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen py-4 xs:py-6 sm:py-8 safe-top safe-bottom">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <Breadcrumbs crumbs={crumbs} />

          {/* Header */}
          <div className="mb-6 xs:mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-fluid-xl sm:text-fluid-2xl font-semibold text-gray-900 mb-2 truncate">
                  Subjects
                </h1>
                <p className="text-gray-600 text-fluid-sm xs:text-fluid-base truncate">
                  {user?.selected_year} • {filteredSubjects.length} subjects available
                </p>
              </div>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 xs:mb-6 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
              <p className="text-fluid-sm">{error}</p>
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="min-h-touch w-full xs:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 xs:h-12 xs:w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-gray-600 text-fluid-sm xs:text-fluid-base">Loading subjects...</p>
              </div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8 xs:py-12 bg-white rounded-lg xs:rounded-xl shadow-lg px-4 xs:px-6">
              <div className="text-4xl xs:text-5xl sm:text-6xl mb-4">📚</div>
              <p className="text-fluid-lg sm:text-fluid-xl font-semibold text-gray-900 mb-2">No subjects found</p>
              <p className="text-fluid-sm xs:text-fluid-base text-gray-600">
                No subjects available for {user?.selected_year}
              </p>
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="mt-4 min-h-touch px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Refresh Subjects
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 md:gap-6">
              {filteredSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject)}
                  className="group relative bg-white rounded-lg xs:rounded-xl shadow-sm hover:shadow-md p-4 xs:p-5 md:p-6 text-left transition-all duration-200 border border-gray-200 hover:border-indigo-300 min-h-touch"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3 xs:mb-4">
                      <div className="w-10 h-10 xs:w-12 xs:h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-xl xs:text-2xl shrink-0">
                        📖
                      </div>
                    </div>

                    <h3 className="font-semibold text-fluid-sm xs:text-fluid-base mb-2 text-gray-900 line-clamp-2">
                      {subject.name}
                    </h3>
                    
                    <div className="space-y-1 mb-3 xs:mb-4">
                      {subject.code && (
                        <p className="text-fluid-xs xs:text-fluid-sm text-gray-600 truncate">Code: {subject.code}</p>
                      )}
                      {subject.branch && (
                        <p className="text-fluid-xs xs:text-fluid-sm text-gray-500 truncate">{subject.branch}</p>
                      )}
                      {subject.description && (
                        <p className="text-fluid-xs xs:text-fluid-sm text-gray-500 line-clamp-2">{subject.description}</p>
                      )}
                    </div>

                    {/* Arrow indicator */}
                    <div className="flex items-center text-indigo-600 font-medium text-fluid-xs xs:text-fluid-sm mt-3 xs:mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject tips modal */}
      {showTips && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 xs:p-4 safe-inset">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTips(false)} />
          <div className="relative z-50 bg-white rounded-xl xs:rounded-2xl shadow-2xl p-4 xs:p-6 max-w-lg w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-fluid-lg xs:text-fluid-xl font-semibold mb-2">Quick tips</h3>
            <p className="text-fluid-xs xs:text-fluid-sm text-gray-600 mb-4">Use bookmarks to resume faster and mark complete to track progress.</p>
            <ul className="space-y-2 text-fluid-xs xs:text-fluid-sm text-gray-700 mb-4 list-disc list-inside">
              <li>⭐ Bookmark notes to continue from Dashboard.</li>
              <li>✅ Mark as complete to track your study progress.</li>
              <li>AI summary and Q&A available inside each note.</li>
            </ul>
            <div className="flex flex-col xs:flex-row justify-end gap-2 xs:gap-3">
              <button
                className="min-h-touch px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowTips(false)}
              >
                Close
              </button>
              <button
                className="min-h-touch px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
                onClick={() => {
                  localStorage.setItem('sv_subject_tips_seen', '1');
                  setShowTips(false);
                  if (pendingSubject) {
                    navigate(`/notes?subjectId=${pendingSubject.id}&subjectName=${encodeURIComponent(pendingSubject.name)}&branch=${encodeURIComponent(pendingSubject.branch || '')}&semester=${encodeURIComponent(pendingSubject.semester || '')}`);
                    setPendingSubject(null);
                  }
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}