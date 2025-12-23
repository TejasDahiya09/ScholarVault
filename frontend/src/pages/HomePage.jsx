import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import client from "../api/client";
import useAuth from "../store/useAuth";

/**
 * HomePage - Simplified to match actual database structure
 * Branch → Semester → Subject → Notes
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false); // subjects fetch
  const [initializing, setInitializing] = useState(true); // initial branches load
  
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);

  // Fetch all subjects once on mount
  useEffect(() => {
    async function initializePage() {
      try {
        const res = await client.get('/api/subjects');
        setAllSubjects(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to initialize page:", err);
      } finally {
        setInitializing(false);
      }
    }
    initializePage();
  }, []);

  // Compute filtered data from allSubjects (client-side filtering)
  const { branches, semesters, filteredSubjects } = useMemo(() => {
    // Filter by selected year
    const yearToSemesters = {
      '1st Year': ['1', '2', '1st year', '1st year '],
      '2nd Year': ['3', '4', '2nd year', '2nd year ']
    };
    const validSemestersNorm = user?.selected_year
      ? (yearToSemesters[user.selected_year] || []).map(s => String(s).trim().toLowerCase())
      : [];
    
    const yearFiltered = user?.selected_year 
      ? allSubjects.filter(s => validSemestersNorm.includes(String(s.semester || '').trim().toLowerCase()))
      : allSubjects;
    
    // Extract unique branches
    const uniqueBranches = [...new Set(yearFiltered.map(s => s.branch).filter(Boolean))];
    const branchList = uniqueBranches.map((name, idx) => ({ id: String(idx + 1), name }));
    
    // Extract unique semesters (filtered by year)
    const uniqueSemesters = [...new Set(yearFiltered.map(s => s.semester).filter(Boolean))];
    const semesterList = uniqueSemesters.sort().map((name, idx) => ({ id: String(idx + 1), name }));
    
    // Filter subjects by selected branch and semester
    let filtered = yearFiltered;
    if (selectedBranch) {
      filtered = filtered.filter(s => s.branch === selectedBranch.name);
    }
    if (selectedSemester) {
      filtered = filtered.filter(s => s.semester === selectedSemester.name);
    }
    
    return {
      branches: branchList,
      semesters: semesterList,
      filteredSubjects: filtered,
    };
  }, [allSubjects, user?.selected_year, selectedBranch, selectedSemester]);

  // Update subjects when filters change
  useEffect(() => {
    if (selectedBranch && selectedSemester) {
      setSubjects(filteredSubjects);
    } else {
      setSubjects([]);
    }
  }, [selectedBranch, selectedSemester, filteredSubjects]);

  // Breadcrumbs
  const crumbs = [
    { label: "Branches", onClick: () => { setSelectedBranch(null); setSelectedSemester(null); } },
    selectedBranch && { label: selectedBranch.name, onClick: () => setSelectedSemester(null) },
    selectedSemester && { label: selectedSemester.name },
  ].filter(Boolean);

  // Determine what to display
  let displayList = [];
  let title = "Select Branch";
  let isSubjectLevel = false;

  if (!selectedBranch) {
    displayList = branches;
    title = "Select Branch";
  } else if (!selectedSemester) {
    displayList = semesters;
    title = "Select Semester";
  } else {
    displayList = subjects;
    title = loading ? "Loading subjects..." : "Subjects";
    isSubjectLevel = true;
  }

  // Show empty state if branches are empty on load
  const showEmptyBranches = !selectedBranch && branches.length === 0 && !initializing;
  // Handle item click
  const handleItemClick = (item) => {
    if (!selectedBranch) {
      setSelectedBranch(item);
    } else if (!selectedSemester) {
      setSelectedSemester(item);
    } else if (isSubjectLevel) {
      // Navigate to notes page for this subject
      navigate(`/notes?subjectId=${item.id}&subjectName=${encodeURIComponent(item.name)}&branch=${encodeURIComponent(selectedBranch.name)}&semester=${encodeURIComponent(selectedSemester.name)}`);
    }
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Breadcrumbs */}
        <Breadcrumbs crumbs={crumbs} />

        {/* Header */}
        <div className="mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {!selectedBranch && "Choose your engineering branch to get started"}
            {selectedBranch && !selectedSemester && "Select your current semester"}
            {selectedBranch && selectedSemester && "Browse subjects and study materials"}
          </p>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48 sm:h-56 md:h-64">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-3 sm:border-4 border-indigo-200 border-t-indigo-600"></div>
              <p className="text-base sm:text-lg text-gray-600">Loading...</p>
            </div>
          </div>
        ) : showEmptyBranches ? (
          <div className="text-center py-8 sm:py-12 md:py-16 bg-white rounded-xl sm:rounded-2xl shadow-lg px-4">
            <div className="text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4">📚</div>
            <p className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No branches available</p>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {user?.selected_year 
                ? `No data available for ${user.selected_year}. Check back soon!`
                : 'Please select your academic year in your Profile first.'}
            </p>
            {!user?.selected_year && (
              <button
                onClick={() => navigate('/profile')}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 font-semibold relative overflow-hidden group text-sm sm:text-base"
              >
                <span className="relative z-10">Go to Profile</span>
                <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </button>
            )}
          </div>
        ) : displayList.length === 0 && isSubjectLevel ? (
          <div className="text-center py-8 sm:py-12 md:py-16 bg-white rounded-xl sm:rounded-2xl shadow-lg px-4">
            <div className="text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4">📚</div>
            <p className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No subjects found</p>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">No subjects available for this branch and semester</p>
            <button
              onClick={() => setSelectedSemester(null)}
              className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 hover:scale-105 font-semibold relative overflow-hidden group text-sm sm:text-base"
            >
              <span className="relative z-10">Try Different Semester</span>
              <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {displayList.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md p-4 sm:p-5 md:p-6 text-left transition-all duration-200 border border-gray-200 hover:border-gray-300"
              >
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                      {isSubjectLevel ? "📖" : !selectedBranch ? "🎓" : "📅"}
                    </div>
                    {item.progress !== undefined && (
                      <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-md text-[10px] sm:text-xs font-medium">
                        {item.progress}%
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm sm:text-base mb-1.5 sm:mb-2 text-gray-900">{item.name}</h3>
                  
                  {isSubjectLevel && (
                    <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-4">
                      {item.code && (
                        <p className="text-xs sm:text-sm text-gray-600">Code: {item.code}</p>
                      )}
                      {item.description && (
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  )}

                  {item.progress !== undefined && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Arrow indicator */}
                  <div className="flex items-center text-gray-500 font-medium text-xs sm:text-sm mt-3 sm:mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
