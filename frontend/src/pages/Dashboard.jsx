import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import useAuth from "../store/useAuth";
import bookmarksAPI from "../api/bookmarks";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalTime: 0,
    unitsCompleted: 0,
    currentStreak: 0
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

  // Fetch data on mount, year change, and when learning updates occur
  useEffect(() => {
    fetchDashboardData();
    // Subscribe to learning updates from NotesPage
    const handleLearningUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener("learning:update", handleLearningUpdate);
    return () => {
      window.removeEventListener("learning:update", handleLearningUpdate);
    };
  }, [fetchDashboardData]);

  // Stay on Dashboard even if there are no bookmarks
  // Previously redirected to "/home" which prevented accessing Dashboard.
  // Now we show an empty state inside the Dashboard instead.

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

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch bookmarks from new API
      try {
        const bookmarks = await bookmarksAPI.getBookmarksWithDetails();
        setBookmarkedNotes(bookmarks);
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
        setBookmarkedNotes([]);
      }
      
      // Fetch subjects (all), then filter by selected year
      let yearFilteredSubjects = [];
      try {
        const subjectsRes = await client.get('/api/subjects');
        const allSubjects = subjectsRes.data || [];
        yearFilteredSubjects = filterSubjectsByYear(allSubjects);
        
        // Set subjects without loading progress first (faster initial render)
        setSubjects(yearFilteredSubjects.map(s => ({ ...s, progress: -1 })));
        
        // Async load progress for each subject (progressive UI enhancement only)
        // NOTE: Stats come from backend analytics - do NOT update stats.unitsCompleted here
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

      // Fetch analytics (time, streaks, weekly activity) - SINGLE SOURCE OF TRUTH
      try {
        const analyticsRes = await client.get('/api/progress/analytics');
        const a = analyticsRes.data || {};
        
        // Backend analytics is the single source of truth for all stats
        setStats({
          totalTime: a.stats?.totalTimeHours || 0,
          unitsCompleted: a.stats?.completedUnitsTotal || 0,
          currentStreak: a.stats?.currentStreak || 0
        });
        
        setWeeklyActivity(Array.isArray(a.weekly) ? a.weekly : []);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        // Set empty weekly activity as fallback
        const today = new Date().getDay();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        setWeeklyActivity(
          days.map((day, index) => ({
            day,
            minutes: 0,
            isToday: index === today
          }))
        );
      }

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
  }, [user?.selected_year, filterSubjectsByYear]);

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
    <div className="min-h-screen py-4 xs:py-6 sm:py-8 safe-top safe-bottom">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
        {/* Error Display */}
        {error && (
          <div className="mb-4 xs:mb-6 p-3 xs:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
              <p className="text-sm xs:text-base">{error}</p>
              <button onClick={fetchDashboardData} className="min-h-touch min-w-touch px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 whitespace-nowrap shrink-0">
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-4 xs:mb-6 sm:mb-8">
          <h1 className="text-fluid-xl sm:text-fluid-2xl font-semibold text-gray-900 mb-1 xs:mb-2">Dashboard</h1>
          <p className="text-gray-600 text-fluid-xs xs:text-fluid-sm">Welcome back! Here's your learning overview</p>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 xs:gap-4 lg:gap-6 mb-4 xs:mb-6 sm:mb-8">
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 border border-gray-200 min-h-touch touch:active:scale-95 transition-transform">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-fluid-xs text-gray-500 mb-1 uppercase tracking-wide truncate">Study Time</p>
                <p className="text-fluid-xl sm:text-fluid-2xl font-semibold text-gray-900 truncate">{stats.totalTime}h</p>
              </div>
              <div className="text-fluid-xl sm:text-fluid-2xl shrink-0">⏱️</div>
            </div>
          </div>
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 border border-gray-200 min-h-touch touch:active:scale-95 transition-transform">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-fluid-xs text-gray-500 mb-1 uppercase tracking-wide truncate">Units Completed</p>
                <p className="text-fluid-xl sm:text-fluid-2xl font-semibold text-gray-900 truncate">{stats.unitsCompleted}</p>
              </div>
              <div className="text-fluid-xl sm:text-fluid-2xl shrink-0">✅</div>
            </div>
          </div>
          <div className="bg-white rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 border border-gray-200 min-h-touch xs:col-span-2 md:col-span-1 touch:active:scale-95 transition-transform">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-fluid-xs text-gray-500 mb-1 uppercase tracking-wide truncate">Study Streak</p>
                <p className="text-fluid-xl sm:text-fluid-2xl font-semibold text-gray-900 truncate">{stats.currentStreak} days</p>
              </div>
              <div className="text-fluid-xl sm:text-fluid-2xl shrink-0">🔥</div>
            </div>
          </div>
        </div>

        {/* Bookmarked for Learning - Always shown with empty state */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 mb-4 xs:mb-6 sm:mb-8 border border-amber-200">
          <h3 className="text-fluid-base sm:text-fluid-lg font-semibold text-gray-900 mb-3 xs:mb-4 truncate">📚 Saved for Learning</h3>

          {bookmarkedNotes.length === 0 ? (
            <div className="p-3 xs:p-4 bg-white rounded-lg border border-amber-100">
              <p className="text-fluid-sm text-gray-700">No bookmarks yet.</p>
              <p className="text-fluid-xs text-gray-500 mt-1">Bookmark notes while studying to find them quickly here.</p>
              <div className="mt-3 xs:mt-4 flex flex-col xs:flex-row gap-2 xs:gap-3">
                <button
                  onClick={() => navigate('/home')}
                  className="min-h-touch w-full xs:w-auto px-4 py-2 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                >
                  Browse Subjects
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="min-h-touch w-full xs:w-auto px-4 py-2 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                >
                  Search Notes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-3 mb-3 xs:mb-4">
                {paginatedBookmarks.map((bookmark) => (
                  <button
                    key={bookmark.note_id}
                    onClick={() => {
                      const note = bookmark.notes;
                      navigate(`/notes?subjectId=${note.subject_id}&noteId=${note.id}`);
                    }}
                    className="text-left p-3 xs:p-4 bg-white rounded-lg hover:shadow-md transition-all border border-amber-100 min-h-touch active:scale-98"
                  >
                    <p className="font-medium text-fluid-sm text-gray-900 truncate">{bookmark.notes?.file_name}</p>
                    <p className="text-fluid-xs text-gray-500 mt-1 truncate">{bookmark.notes?.subject}</p>
                  </button>
                ))}
              </div>
              {bookmarkedNotes.length > BOOKMARKS_PER_PAGE && (
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-3 text-fluid-xs">
                  <span className="text-amber-700 whitespace-nowrap">Page {bookmarksPage + 1} of {Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE)}</span>
                  <div className="flex gap-2 w-full xs:w-auto">
                    <button
                      onClick={() => setBookmarksPage(Math.max(0, bookmarksPage - 1))}
                      disabled={bookmarksPage === 0}
                      className="min-h-touch flex-1 xs:flex-none px-3 xs:px-4 py-2 bg-amber-100 text-amber-700 rounded disabled:opacity-50 hover:bg-amber-200 transition-colors whitespace-nowrap"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setBookmarksPage(Math.min(Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE) - 1, bookmarksPage + 1))}
                      disabled={bookmarksPage >= Math.ceil(bookmarkedNotes.length / BOOKMARKS_PER_PAGE) - 1}
                      className="min-h-touch flex-1 xs:flex-none px-3 xs:px-4 py-2 bg-amber-100 text-amber-700 rounded disabled:opacity-50 hover:bg-amber-200 transition-colors whitespace-nowrap"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Continue Studying */}
        {nextUnit && (
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 mb-4 xs:mb-6 sm:mb-8 text-white">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4">
              <div className="flex-1 min-w-0 w-full xs:w-auto">
                <p className="text-fluid-xs text-gray-300 mb-2 uppercase tracking-wide">Continue Studying</p>
                <h3 className="text-fluid-base sm:text-fluid-lg font-semibold truncate">{nextUnit.subject}</h3>
                <p className="text-fluid-sm text-gray-300 truncate">{nextUnit.unit}</p>
              </div>
              <button onClick={() => navigate(`/home`)} className="min-h-touch w-full xs:w-auto px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 active:scale-98 transition-transform whitespace-nowrap">
                Continue →
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-6 sm:gap-8">
          {/* Subjects Progress - PAGINATED */}
          <div className="lg:col-span-2 space-y-4 xs:space-y-6 sm:space-y-8">
            <div className="bg-white rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 border border-gray-200">
              <h2 className="text-fluid-base sm:text-fluid-lg font-semibold text-gray-900 mb-3 xs:mb-4 truncate">My Subjects</h2>
              {subjects.length === 0 ? (
                <div className="text-center py-8 xs:py-12">
                  <p className="text-gray-500 text-fluid-sm">No subjects enrolled yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 xs:space-y-4 mb-3 xs:mb-4">
                    {paginatedSubjects.map((subject) => (
                      <div key={subject.id} className="min-h-touch flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <h3 className="font-medium text-fluid-xs xs:text-fluid-sm text-gray-900 truncate flex-1 min-w-0">{subject.name}</h3>
                          <span className="text-fluid-xs font-semibold text-gray-900 whitespace-nowrap shrink-0">
                            {subject.progress >= 0 ? `${Math.round(subject.progress)}%` : '...'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 xs:h-2.5">
                          <div
                            className="bg-indigo-600 h-2 xs:h-2.5 rounded-full transition-all duration-300"
                            style={{ width: subject.progress >= 0 ? `${subject.progress}%` : '30%', opacity: subject.progress >= 0 ? 1 : 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {subjects.length > SUBJECTS_PER_PAGE && (
                    <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 xs:gap-3 text-fluid-xs">
                      <span className="text-gray-500 whitespace-nowrap">Page {subjectsPage + 1} of {Math.ceil(subjects.length / SUBJECTS_PER_PAGE)}</span>
                      <div className="flex gap-2 w-full xs:w-auto">
                        <button onClick={() => setSubjectsPage(Math.max(0, subjectsPage - 1))} disabled={subjectsPage === 0} className="min-h-touch flex-1 xs:flex-none px-3 xs:px-4 py-2 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200 transition-colors whitespace-nowrap">← Prev</button>
                        <button onClick={() => setSubjectsPage(Math.min(Math.ceil(subjects.length / SUBJECTS_PER_PAGE) - 1, subjectsPage + 1))} disabled={subjectsPage >= Math.ceil(subjects.length / SUBJECTS_PER_PAGE) - 1} className="min-h-touch flex-1 xs:flex-none px-3 xs:px-4 py-2 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200 transition-colors whitespace-nowrap">Next →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Needs Attention */}
          <div className="space-y-4 xs:space-y-6">
            {needsAttention.length > 0 && (
              <div className="bg-amber-50 rounded-lg xs:rounded-xl shadow-sm p-4 xs:p-5 sm:p-6 border border-amber-200">
                <h2 className="text-fluid-base font-semibold text-gray-900 mb-3 truncate">⚠️ Needs Attention</h2>
                <div className="space-y-2 xs:space-y-3">
                  {needsAttention.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => navigate(`/notes?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name || "")}&branch=${encodeURIComponent(subject.branch || "")}&semester=${encodeURIComponent(subject.semester || "")}`)}
                      className="min-h-touch w-full text-left p-3 xs:p-4 bg-white border border-amber-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition active:scale-98"
                    >
                      <h3 className="font-semibold text-fluid-xs xs:text-fluid-sm text-gray-900 truncate">{subject.name}</h3>
                      <p className="text-fluid-xs text-amber-700 mt-1">{Math.round(subject.progress)}% complete</p>
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
