import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchDashboardData();
  }, [user?.selected_year]);

  // Redirect to subjects if no bookmarks available
  useEffect(() => {
    if (!loading && !error && bookmarkedNotes.length === 0) {
      navigate('/home');
    }
  }, [loading, error, bookmarkedNotes.length, navigate]);

  // Helper to filter subjects by selected year
  const filterSubjectsByYear = (subjects) => {
    if (!user?.selected_year) return subjects;
    
    // Map year to semesters: handle numeric and "1st Year" labels
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
  };

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch bookmarked notes with details
      try {
        const bookmarksRes = await client.get('/api/bookmarks/details');
        setBookmarkedNotes(bookmarksRes.data?.bookmarks || []);
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
        setBookmarkedNotes([]);
      }
      
      // Fetch only user's subjects (subjects they've interacted with)
      let yearFilteredSubjects = [];
      try {
        const subjectsRes = await client.get('/api/subjects', {
          params: { userOnly: 'true' }
        });
        const allSubjects = subjectsRes.data || [];
        
        // Filter by selected year
        yearFilteredSubjects = filterSubjectsByYear(allSubjects);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setError("Failed to load subjects. Please try refreshing.");
      }
      
      // Fetch progress for each subject with actual completion data
      const subjectsWithProgress = await Promise.all(
        yearFilteredSubjects.map(async (subject) => {
          try {
            // Get completion status for this subject
            const completionRes = await client.get(`/api/subjects/${subject.id}/progress`);
            const completedNotes = completionRes.data?.completed_units || 0;
            const totalNotes = completionRes.data?.total_units || 0;
            const progressPercent = completionRes.data?.progress_percent || 0;
            
            return {
              ...subject,
              progress: progressPercent,
              completed: completedNotes,
              total: totalNotes
            };
          } catch (err) {
            console.error(`Error fetching progress for ${subject.id}:`, err);
            return {
              ...subject,
              progress: 0,
              completed: 0,
              total: 0
            };
          }
        })
      );

      setSubjects(subjectsWithProgress);

      // Calculate overall stats from all subjects
      const totalCompleted = subjectsWithProgress.reduce((sum, s) => sum + (s.completed || 0), 0);
      const totalNotes = subjectsWithProgress.reduce((sum, s) => sum + (s.total || 0), 0);
      
      setStats({
        totalTime: 0, // Will be populated when backend endpoint is ready
        unitsCompleted: totalCompleted,
        longestStreak: 0 // Will be populated when backend endpoint is ready
      });

      // Weekly activity - showing 0 for now, will be populated with real data
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setWeeklyActivity(
        days.map((day, index) => ({
          day,
          minutes: 0, // Will be populated when backend activity tracking is implemented
          isToday: index === today
        }))
      );

      // Get recent activity from localStorage
      const recent = JSON.parse(localStorage.getItem("sv_last_note") || "null");
      if (recent) {
        setRecentActivity([recent]);
      }

      // Find next unit to study (first incomplete unit from any subject)
      for (const subject of subjectsWithProgress) {
        if (subject.progress < 100) {
          try {
            const unitsRes = await client.get(`/api/subjects/${subject.id}/units`);
            const units = unitsRes.data || [];
            const incompleteUnit = units.find(u => !u.is_completed);
            if (incompleteUnit) {
              setNextUnit({
                subject: subject.name,
                unit: incompleteUnit.name,
                unitId: incompleteUnit.id,
                subjectId: subject.id
              });
              break;
            }
          } catch (err) {
            console.error("Error fetching units:", err);
          }
        }
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  const needsAttention = subjects
    .filter(s => s.progress > 0 && s.progress < 40)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 3);

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
              <button 
                onClick={fetchDashboardData}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">Welcome back! Here's your learning overview</p>
        </div>

        {/* 1️⃣ Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Study Time</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.totalTime}m</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-blue-50 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                ⏱️
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Units Completed</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.unitsCompleted}</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-green-50 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                ✅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Study Streak</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.longestStreak} days</p>
              </div>
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-orange-50 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                🔥
              </div>
            </div>
          </div>
        </div>

        {/* 2️⃣ Bookmarked for Learning */}
        {bookmarkedNotes.length > 0 && (
          <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-amber-200">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <h3 className="text-lg font-semibold text-gray-900\">Saved for Learning</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bookmarkedNotes.slice(0, 4).map((bookmark) => (
                <button
                  key={bookmark.note_id}
                  onClick={() => {
                    const note = bookmark.notes;
                    navigate(`/notes?subjectId=${note.subject_id}&noteId=${note.id}`);
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md hover:border-amber-300 transition-all border border-amber-100"
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{bookmark.notes?.file_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{bookmark.notes?.subject}</p>
                </button>
              ))}
            </div>
            {bookmarkedNotes.length > 4 && (
              <button
                onClick={() => navigate('/notes')}
                className="mt-3 text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                View all {bookmarkedNotes.length} saved notes →
              </button>
            )}
          </div>
        )}

        {/* 2️⃣ Continue Studying */}
        {nextUnit ? (
          <div className="bg-linear-to-r from-gray-900 to-gray-800 rounded-lg sm:rounded-xl shadow-sm p-4 sm:mb-8 sm:p-6 mb-6 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-300 mb-2 uppercase tracking-wide">Continue Studying</p>
                <h3 className="text-lg sm:text-xl font-semibold mb-1">{nextUnit.subject}</h3>
                <p className="text-xs sm:text-sm text-gray-300">{nextUnit.unit}</p>
              </div>
              <button
                onClick={() => navigate(`/home`)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-gray-900 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-100 transition-all duration-200 whitespace-nowrap"
              >
                Continue →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200 text-center">
            <div className="text-4xl sm:text-5xl mb-3">🎉</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600 text-xs sm:text-sm">You've completed all available units. Great work!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column: Subjects Progress (Simplified) */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* 3️⃣ Subjects Progress Overview - SIMPLIFIED */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">My Subjects</h2>
                <button
                  onClick={() => navigate('/progress')}
                  className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  View Details →
                </button>
              </div>
              
              {subjects.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📚</div>
                  <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">No subjects enrolled yet</p>
                  <button
                    onClick={() => navigate('/home')}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-lg hover:bg-indigo-700 transition-all"
                  >
                    Browse Subjects
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjects.slice(0, 5).map((subject) => (
                    <div key={subject.id} className="group">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{subject.name}</h3>
                          <p className="text-xs text-gray-500">{subject.completed}/{subject.total} units</p>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 shrink-0">{Math.round(subject.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-linear-to-r from-indigo-600 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {subjects.length > 5 && (
                    <button
                      onClick={() => navigate('/progress')}
                      className="w-full mt-3 text-xs text-gray-600 hover:text-gray-900 font-medium"
                    >
                      +{subjects.length - 5} more subjects
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4️⃣ Weekly Activity - MINI VERSION */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">This Week</h2>
                <button
                  onClick={() => navigate('/progress')}
                  className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Full Analytics →
                </button>
              </div>
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-20 sm:h-24">
                {weeklyActivity.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${
                          day.isToday ? 'bg-indigo-600' : 'bg-indigo-300'
                        }`}
                        style={{ height: `${Math.min((day.minutes / 60) * 100, 100) || 5}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${day.isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {day.day.charAt(0)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">Daily study activity</p>
            </div>
          </div>

          {/* Right Column: Needs Attention + Recent Activity */}
          <div className="space-y-6 sm:space-y-8">
            {/* 5️⃣ Subjects That Need Attention */}
            {needsAttention.length > 0 && (
              <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-amber-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="text-lg sm:text-xl">⚠️</span>
                  <span>Needs Attention</span>
                </h2>
                <div className="space-y-2 sm:space-y-3">
                  {needsAttention.slice(0, 3).map((subject) => (
                    <div key={subject.id} className="p-3 bg-white border border-amber-200 rounded-lg hover:border-amber-300 transition-all">
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-1">{subject.name}</h3>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-amber-700 font-medium">{Math.round(subject.progress)}% complete</span>
                        <button
                          onClick={() => navigate('/home')}
                          className="text-xs font-medium text-indigo-600 hover:underline"
                        >
                          Resume →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6️⃣ Recent Activity */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Activity</h2>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl sm:text-4xl mb-3">📝</div>
                  <p className="text-gray-500 text-xs sm:text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {recentActivity.slice(0, 3).map((item, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        if (item.noteId) {
                          navigate(`/notes?noteId=${item.noteId}`);
                        } else if (item.unitId) {
                          navigate(`/notes?unitId=${item.unitId}`);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-base sm:text-lg shrink-0">
                          📄
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{item.title}</h3>
                          {item.unitName && (
                            <p className="text-xs text-gray-500 truncate">{item.unitName}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">Recently viewed</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
