import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import client from "../api/client";
import useAuth from "../store/useAuth";

/**
 * HomePage - Shows all subjects for user's selected year
 * Organized by semester with visual separation
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [pendingSubject, setPendingSubject] = useState(null);

  // Fetch all subjects on mount
  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        setError(null);
        const res = await client.get('/api/subjects');
        setAllSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setError("Failed to load subjects. Please try again.");
        setAllSubjects([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, []);

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
  const handleSubjectClick = (subject) => {
    const seen = localStorage.getItem('sv_subject_tips_seen') === '1';
    if (!seen) {
      setPendingSubject(subject);
      setShowTips(true);
      return;
    }
    navigate(`/notes?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&branch=${encodeURIComponent(subject.branch || '')}&semester=${encodeURIComponent(subject.semester || '')}`);
  };

  if (!user?.selected_year) {
    return (
      <div className="min-h-screen py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-8 text-center py-12 bg-white rounded-xl shadow-lg px-4">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">Select Your Year</p>
            <p className="text-base text-gray-600 mb-6">
              Please select your academic year in your Profile to see subjects.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
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
      <div className="min-h-screen py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <Breadcrumbs crumbs={crumbs} />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Subjects
            </h1>
            <p className="text-gray-600">
              {user?.selected_year} • {filteredSubjects.length} subjects available
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-gray-600">Loading subjects...</p>
              </div>
            </div>
          ) : Object.keys(filteredSubjects).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg px-4">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl font-semibold text-gray-900 mb-2">No subjects found</p>
              <p className="text-base text-gray-600">
                No subjects available for {user?.selected_year}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectClick(subject)}
                  className="group relative bg-white rounded-lg shadow-sm hover:shadow-md p-5 md:p-6 text-left transition-all duration-200 border border-gray-200 hover:border-indigo-300 hover:scale-105"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-2xl shrink-0">
                        📖
                      </div>
                      {subject.progress !== undefined && (
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                          {subject.progress}%
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-base mb-2 text-gray-900 line-clamp-2">
                      {subject.name}
                    </h3>
                    
                    <div className="space-y-1 mb-4">
                      {subject.code && (
                        <p className="text-sm text-gray-600">Code: {subject.code}</p>
                      )}
                      {subject.branch && (
                        <p className="text-sm text-gray-500">{subject.branch}</p>
                      )}
                      {subject.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{subject.description}</p>
                      )}
                    </div>

                    {subject.progress !== undefined && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${subject.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Arrow indicator */}
                    <div className="flex items-center text-indigo-600 font-medium text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTips(false)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">Quick tips</h3>
            <p className="text-sm text-gray-600 mb-4">Use bookmarks to resume faster and mark complete to track progress.</p>
            <ul className="space-y-2 text-sm text-gray-700 mb-4 list-disc list-inside">
              <li>⭐ Bookmark notes to continue from Dashboard.</li>
              <li>✅ Mark as complete to track your study progress.</li>
              <li>AI summary and Q&A available inside each note.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowTips(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
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
