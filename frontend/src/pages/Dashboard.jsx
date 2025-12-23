import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import client from "../api/client";
import useAuth from "../store/useAuth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTime: 0,
    unitsCompleted: 0,
    longestStreak: 0
  });
  const [subjects, setSubjects] = useState([]);
  const [weeklyActivity, setWeeklyActivity] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [nextUnit, setNextUnit] = useState(null);
  const [bookmarkedNotes, setBookmarkedNotes] = useState([]);
  const [bookmarksPage, setBookmarksPage] = useState(0);
  const [subjectsPage, setSubjectsPage] = useState(0);

  // Pagination constants
  const BOOKMARKS_PER_PAGE = 4;
  const SUBJECTS_PER_PAGE = 5;

  useEffect(() => {
    fetchDashboardData();
  }, [user?.selected_year]);

  // Redirect to subjects if no bookmarks available
  useEffect(() => {
    if (!loading && !error && bookmarkedNotes.length === 0) {
      navigate('/home');
    }
  }, [loading, error, bookmarkedNotes.length, navigate]);

  // Memoized filter function
  const filterSubjectsByYear = useCallback((subjects) => {
    if (!user?.selected_year) return subjects;
    
    const yearToSemesters = {
      '1st Year': ['1', '2', '1st year'],
      '2nd Year': ['3', '4', '2nd year'],
      '3rd Year': ['5', '6', '3rd year'],
      '4th Year': ['7', '8', '4th year']
    };
    
    const validSemestersNorm = (yearToSemesters[user.selected_year] || [])
      .map(s => String(s).trim().toLowerCase());
    return subjects.filter(subject => 
      validSemestersNorm.includes(String(subject.semester || '').trim().toLowerCase())
    );
  }, [user?.selected_year]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch bookmarks immediately
      try {
        const bookmarksRes = await client.get('/api/bookmarks/details');
        setBookmarkedNotes(bookmarksRes.data?.bookmarks || []);
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
        setBookmarkedNotes([]);
      }
      
      // Fetch subjects
      let yearFilteredSubjects = [];
      try {
        const subjectsRes = await client.get('/api/subjects', {
          params: { userOnly: 'true' }
        });
        const allSubjects = subjectsRes.data || [];
        yearFilteredSubjects = filterSubjectsByYear(allSubjects);
        
        // Set subjects without loading progress first (faster initial render)
        setSubjects(yearFilteredSubjects.map(s => ({ ...s, progress: -1 })));
        
        // Async load progress for each subject
        yearFilteredSubjects.forEach(async (subject) => {
          try {
            const completionRes = await client.get(`/api/subjects/${subject.id}/progress`);
            setSubjects(prev => prev.map(s => 
              s.id === subject.id 
                ? {
                    ...s,
                    progress: completionRes.data?.progress_percent || 0,
                    completed: completionRes.data?.completed_units || 0,
                    total: completionRes.data?.total_units || 0
                  }
                : s
            ));
          } catch (err) {
            console.error(`Error fetching progress for ${subject.id}:`, err);
          }
        });
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setError("Failed to load subjects. Please try refreshing.");
      }

      // Weekly activity
      const today = new Date().getDay();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setWeeklyActivity(
        days.map((day, index) => ({
          day,
          minutes: 0,
          isToday: index === today
        }))
      );

      // Recent activity
      const recent = JSON.parse(localStorage.getItem("sv_last_note") || "null");
      if (recent) {
        setRecentActivity([recent]);
      }

      // Find next unit to study (lazy loaded)
      const nextSubject = yearFilteredSubjects.find(s => (s.progress || 0) < 100);
      if (nextSubject) {
        try {
          const unitsRes = await client.get(`/api/subjects/${nextSubject.id}/units`);
          const units = unitsRes.data || [];
          const incompleteUnit = units.find(u => !u.is_completed);
          if (incompleteUnit) {
            setNextUnit({
              subject: nextSubject.name,
              unit: incompleteUnit.name,
              unitId: incompleteUnit.id,
              subjectId: nextSubject.id
            });
          }
        } catch (err) {
          console.error("Error fetching units:", err);
        }
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  // Memoize paginated items
  const paginatedBookmarks = useMemo(() => {
    return bookmarkedNotes.slice(
      bookmarksPage * BOOKMARKS_PER_PAGE,
      (bookmarksPage + 1) * BOOKMARKS_PER_PAGE
    );
  }, [bookmarkedNotes, bookmarksPage]);

  const paginatedSubjects = useMemo(() => {
    return subjects.slice(
      subjectsPage * SUBJECTS_PER_PAGE,
      (subjectsPage + 1) * SUBJECTS_PER_PAGE
    );
  }, [subjects, subjectsPage]);

  const needsAttention = useMemo(() => {
    return subjects
      .filter(s => (s.progress || 0) > 0 && (s.progress || 0) < 40)
      .sort((a, b) => (a.progress || 0) - (b.progress || 0))
      .slice(0, 3);
  }, [subjects]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center justify-between">
              <p>{error}</p>
              <button onClick={fetchDashboardData} className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-gray-600 text-xs sm:text-sm">Welcome back! Here's your learning overview</p>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Study Time</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.totalTime}m</p>
              </div>
              <div className="text-2xl">⏱️</div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Units Completed</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.unitsCompleted}</p>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Study Streak</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.longestStreak} days</p>
              </div>
              <div className="text-2xl">🔥</div>
            </div>
          </div>
        </div>

        {/* Bookmarked for Learning - PAGINATED */}
        {bookmarkedNotes.length > 0 && (
          <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Saved for Learning</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {paginatedBookmarks.map((bookmark) => (
                <button
                  key={bookmark.note_id}
                  onClick={() => {
                    const note = bookmark.notes;
                    navigate(`/notes?subjectId=${note.subject_id}&noteId=${note.id}`);
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md transition-all border border-amber-100"
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{bookmark.notes?.file_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{bookmark.notes?.subject}</p>
                </button>
              ))}
            </div>
            {bookmarkedNotes.length > BOOKMARKS_PER_PAGE && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Page {bookmarksPage + 1} of {Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBookmarksPage(Math.max(0, bookmarksPage - 1))}
                    disabled={bookmarksPage === 0}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setBookmarksPage(Math.min(Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE) - 1, bookmarksPage + 1))}
                    disabled={bookmarksPage >= Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE) - 1}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue Studying */}
        {nextUnit && (
          <div className="bg-linear-to-r from-gray-900 to-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-300 mb-2 uppercase">Continue Studying</p>
                <h3 className="text-lg font-semibold">{nextUnit.subject}</h3>
                <p className="text-sm text-gray-300">{nextUnit.unit}</p>
              </div>
              <button onClick={() => navigate(`/home`)} className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100">
                Continue →
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Subjects Progress - PAGINATED */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">My Subjects</h2>
              {subjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No subjects enrolled yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {paginatedSubjects.map((subject) => (
                      <div key={subject.id}>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <h3 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{subject.name}</h3>
                          <span className="text-xs font-semibold text-gray-900">
                            {subject.progress >= 0 ? `${Math.round(subject.progress)}%` : '...'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: subject.progress >= 0 ? `${subject.progress}%` : '30%', opacity: subject.progress >= 0 ? 1 : 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {subjects.length > SUBJECTS_PER_PAGE && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Page {subjectsPage + 1} of {Math.ceil(subjects.length / SUBJECTS_PER_PAGE)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setSubjectsPage(Math.max(0, subjectsPage - 1))} disabled={subjectsPage === 0} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">← Prev</button>
                        <button onClick={() => setSubjectsPage(Math.min(Math.ceil(subjects.length / SUBJECTS_PER_PAGE) - 1, subjectsPage + 1))} disabled={subjectsPage >= Math.ceil(subjects.length / SUBJECTS_PER_PAGE) - 1} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Next →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Needs Attention */}
          <div className="space-y-6">
            {needsAttention.length > 0 && (
              <div className="bg-amber-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-amber-200">
                <h2 className="text-base font-semibold text-gray-900 mb-3">⚠️ Needs Attention</h2>
                <div className="space-y-2">
                  {needsAttention.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => navigate(`/notes?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name || "")}&branch=${encodeURIComponent(subject.branch || "")}&semester=${encodeURIComponent(subject.semester || "")}`)}
                      className="w-full text-left p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition"
                    >
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900">{subject.name}</h3>
                      <p className="text-xs text-amber-700 mt-1">{Math.round(subject.progress)}% complete</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
