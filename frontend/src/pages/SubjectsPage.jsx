import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import client from "../api/client";
import useAuth from "../store/useAuth";

/**
 * SubjectsPage - Browse all subjects for your semester
 * No branch/semester selection required - shows all subjects for user's selected semester
 */
export default function SubjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subjects filtered by user's selected semester
  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        const res = await client.get('/api/subjects');
        const allSubjects = Array.isArray(res.data) ? res.data : [];
        
        // Filter by user's selected semester/year
        const yearToSemesters = {
          '1st Year': ['1', '2', '1st year'],
          '2nd Year': ['3', '4', '2nd year']
        };
        
        const validSemestersNorm = user?.selected_year
          ? (yearToSemesters[user.selected_year] || []).map(s => String(s).trim().toLowerCase())
          : [];
        
        const filteredSubjects = user?.selected_year 
          ? allSubjects.filter(s => validSemestersNorm.includes(String(s.semester || '').trim().toLowerCase()))
          : allSubjects;
        
        setSubjects(filteredSubjects);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setError(err.response?.data?.error || "Failed to load subjects");
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    }
    
    if (user?.selected_year) {
      fetchSubjects();
    }
  }, [user?.selected_year]);

  // Breadcrumbs
  const crumbs = [
    { label: "Home", to: "/home" },
    { label: "Subjects" }
  ];

  // Handle subject click - navigate to notes for that subject
  const handleSubjectClick = (subject) => {
    navigate(`/notes?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&semester=${subject.semester}&branch=${encodeURIComponent(subject.branch || '')}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-8 sm:pb-10 md:pb-12">
      <Breadcrumbs crumbs={crumbs} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Subjects</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Browse subjects and study materials</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No subjects available for your semester</p>
          <button
            onClick={() => navigate("/profile")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Update Semester Selection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => handleSubjectClick(subject)}
              className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-4 sm:p-5 md:p-6 text-left hover:shadow-lg hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-3xl sm:text-4xl md:text-5xl shrink-0">📖</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Semester {subject.semester}
                  </p>
                </div>
              </div>
              <p className="text-indigo-600 text-xs sm:text-sm font-medium group-hover:translate-x-1 transition-transform">
                View materials →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
