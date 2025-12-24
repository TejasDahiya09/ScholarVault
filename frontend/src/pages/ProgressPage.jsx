import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import client from "../api/client";
import useAuth from "../store/useAuth";

export default function ProgressPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    totalTime: 0,
    totalUnits: 0,
    completedUnits: 0,
    longestStreak: 0,
    currentStreak: 0,
    peakStudyTime: null
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [subjectTime, setSubjectTime] = useState([]);
  const [velocity, setVelocity] = useState([]);

  useEffect(() => {
    fetchProgressData();
  }, [user?.selected_year]);

  // Helper to filter subjects by selected year
  const filterSubjectsByYear = (subjects) => {
    if (!user?.selected_year) return subjects;
    
    // Map year to semesters: handle numeric and "1st Year" labels
    const yearToSemesters = {
      '1st Year': ['1', '2', '1st year'],
      '2nd Year': ['3', '4', '2nd year']
    };
    
    const validSemestersNorm = (yearToSemesters[user.selected_year] || [])
      .map(s => String(s).trim().toLowerCase());
    return subjects.filter(subject => 
      validSemestersNorm.includes(String(subject.semester || '').trim().toLowerCase())
    );
  };

  async function fetchProgressData() {
    try {
      setLoading(true);
      
      // Fetch subjects with progress
      const subjectsRes = await client.get('/api/subjects', {
        params: { userOnly: 'true' }
      });
      const allSubjects = subjectsRes.data || [];
      
      // Filter by selected year
      const yearFilteredSubjects = filterSubjectsByYear(allSubjects);
      
      const subjectsWithProgress = await Promise.all(
        yearFilteredSubjects.map(async (subject) => {
          try {
            const completionRes = await client.get(`/api/subjects/${subject.id}/progress`);
            return {
              ...subject,
              progress: completionRes.data?.progress_percent || 0,
              completed: completionRes.data?.completed_units || 0,
              total: completionRes.data?.total_units || 0
            };
          } catch (err) {
            return { ...subject, progress: 0, completed: 0, total: 0 };
          }
        })
      );

      setSubjects(subjectsWithProgress);

      // Calculate stats
      const totalCompleted = subjectsWithProgress.reduce((sum, s) => sum + (s.completed || 0), 0);
      const totalUnits = subjectsWithProgress.reduce((sum, s) => sum + (s.total || 0), 0);
      
      // Fetch analytics (time, streaks, weekly, monthly, subject time, velocity)
      try {
        const analyticsRes = await client.get('/api/progress/analytics');
        const a = analyticsRes.data || {};
        setStats({
          totalTime: a.stats?.totalTimeHours || 0,
          totalUnits,
          completedUnits: totalCompleted,
          longestStreak: a.stats?.longestStreak || 0,
          currentStreak: a.stats?.currentStreak || 0,
          peakStudyTime: typeof a.stats?.peakStudyTime === 'string' && a.stats.peakStudyTime ? a.stats.peakStudyTime : null,
        });
        setWeeklyData(Array.isArray(a.weekly) ? a.weekly : []);
        setMonthlyData(Array.isArray(a.monthly) ? a.monthly : []);
        setSubjectTime(Array.isArray(a.subjectTime) ? a.subjectTime : []);
        setVelocity(Array.isArray(a.velocity) ? a.velocity : []);
      } catch (err) {
        // Fallback to zeroed analytics
        setWeeklyData([]);
        setMonthlyData([]);
        setSubjectTime([]);
        setVelocity([]);
      }

    } catch (error) {
      console.error("Error fetching progress data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Sort subjects by different criteria
  const strongestSubjects = [...subjects].sort((a, b) => b.progress - a.progress).slice(0, 3);
  const needsAttention = [...subjects].filter(s => s.progress > 0 && s.progress < 40).sort((a, b) => a.progress - b.progress);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1 sm:mb-2">
            Progress Analytics
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">Detailed insights into your learning journey</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col gap-2">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-blue-50 flex items-center justify-center text-xl sm:text-2xl">
                ⏱️
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Time</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.totalTime}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col gap-2">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-green-50 flex items-center justify-center text-xl sm:text-2xl">
                ✅
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.completedUnits}/{stats.totalUnits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col gap-2">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-orange-50 flex items-center justify-center text-xl sm:text-2xl">
                🔥
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Streak</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.currentStreak} days</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col gap-2">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-purple-50 flex items-center justify-center text-xl sm:text-2xl">
                🏆
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Best Streak</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{stats.longestStreak} days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Weekly Activity Chart */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h2>
              <div className="flex items-end justify-between gap-2 sm:gap-3 h-40 sm:h-48">
                {weeklyData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${
                          day.isToday ? 'bg-indigo-600' : 'bg-indigo-400'
                        }`}
                        style={{ height: `${Math.min((day.minutes / 120) * 100, 100)}%` }}
                        title={`${day.minutes} minutes`}
                      />
                    </div>
                    <span className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {day.day}
                    </span>
                    <span className="text-xs text-gray-400">{day.minutes}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">30-Day Trend</h2>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-32 sm:h-40 min-w-max">
                  {monthlyData.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-1" style={{ width: '20px' }}>
                      <div className="w-full bg-gray-100 rounded-t relative flex-1">
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-linear-to-t from-indigo-600 to-indigo-400 transition-all duration-300"
                          style={{ height: `${Math.min((day.minutes / 120) * 100, 100)}%` }}
                          title={`${day.date}: ${day.minutes}m, ${day.completed} units`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* All Subjects Detailed Progress */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">All Subjects Progress</h2>
              
              {subjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl sm:text-5xl mb-4">📚</div>
                  <p className="text-gray-500 text-sm mb-4">No subjects enrolled yet</p>
                  <button
                    onClick={() => navigate('/home')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    Browse Subjects
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-all">
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900">{subject.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {subject.completed} of {subject.total} units completed
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg sm:text-xl font-bold text-indigo-600">{Math.round(subject.progress)}%</div>
                          <button
                            onClick={() => navigate('/home')}
                            className="text-xs font-medium text-indigo-600 hover:underline mt-1"
                          >
                            Continue →
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-linear-to-r from-indigo-600 to-indigo-400 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{subject.completed} completed</span>
                        <span>{subject.total - subject.completed} remaining</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Study Velocity Chart */}
            {velocity.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Study Velocity</h2>
                <p className="text-xs text-gray-500 mb-4">Notes completed per week (last 8 weeks)</p>
                <div className="flex items-end justify-between gap-2 h-32 sm:h-40">
                  {velocity.map((week, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '100%' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-linear-to-t from-purple-600 to-purple-400 transition-all duration-300"
                          style={{ height: `${Math.min((week.count / Math.max(...velocity.map(v => v.count), 1)) * 100, 100)}%` }}
                          title={`${week.week}: ${week.count} notes`}
                        />
                      </div>
                      <span className="text-xs text-gray-500 truncate w-full text-center">{week.week}</span>
                      <span className="text-xs font-medium text-gray-700">{week.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Time Breakdown */}
            {subjectTime.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Time Per Subject</h2>
                <div className="space-y-3">
                  {subjectTime.slice(0, 5).map((subject, index) => (
                    <div key={subject.subject_id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs sm:text-sm text-gray-900 truncate">{subject.subject_name}</h3>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${(subject.hours / Math.max(...subjectTime.map(s => s.hours), 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-indigo-700 shrink-0">{subject.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6 sm:space-y-8">
            {/* Peak Study Time */}
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-blue-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">☀️</span>
                Peak Study Time
              </h2>
              {stats.peakStudyTime ? (
                <div className="text-center py-4">
                  <div className="text-3xl sm:text-4xl mb-2">
                    {stats.peakStudyTime === 'morning' && '🌅'}
                    {stats.peakStudyTime === 'afternoon' && '☀️'}
                    {stats.peakStudyTime === 'evening' && '🌆'}
                    {stats.peakStudyTime === 'night' && '🌙'}
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-indigo-700 capitalize">{stats.peakStudyTime}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {stats.peakStudyTime === 'morning' && '5 AM - 12 PM'}
                    {stats.peakStudyTime === 'afternoon' && '12 PM - 5 PM'}
                    {stats.peakStudyTime === 'evening' && '5 PM - 9 PM'}
                    {stats.peakStudyTime === 'night' && '9 PM - 5 AM'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl sm:text-4xl mb-2 text-gray-400">⏳</div>
                  <p className="text-lg sm:text-base text-gray-500">Not enough data yet</p>
                  <p className="text-xs text-gray-400 mt-2">Study at least 3 times to see your peak time!</p>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center mt-2">Your most productive study time</p>
            </div>

            {/* Top Performing Subjects */}
            {strongestSubjects.length > 0 && (
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-green-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  Top Performers
                </h2>
                <div className="space-y-3">
                  {strongestSubjects.map((subject, index) => (
                    <div key={subject.id} className="p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm shrink-0">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{subject.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{ width: `${subject.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-green-700">{Math.round(subject.progress)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subjects Needing Attention */}
            {needsAttention.length > 0 && (
              <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-amber-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  Needs Focus
                </h2>
                <div className="space-y-3">
                  {needsAttention.slice(0, 5).map((subject) => (
                    <div key={subject.id} className="p-3 bg-white rounded-lg border border-amber-200">
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2">{subject.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-amber-600 h-1.5 rounded-full"
                            style={{ width: `${subject.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-amber-700">{Math.round(subject.progress)}%</span>
                      </div>
                      <button
                        onClick={() => navigate('/home')}
                        className="text-xs font-medium text-indigo-600 hover:underline mt-2"
                      >
                        Resume Study →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Streak Info */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Study Streak</h2>
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="text-4xl sm:text-5xl mb-2">🔥</div>
                  <div className="text-3xl sm:text-4xl font-bold text-orange-600 mb-1">{stats.currentStreak}</div>
                  <p className="text-xs sm:text-sm text-gray-600">Day Streak</p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Longest Streak</span>
                    <span className="font-semibold text-gray-900">{stats.longestStreak} days</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Keep studying daily to maintain your streak!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
