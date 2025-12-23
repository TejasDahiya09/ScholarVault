import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../store/useAuth";
import client from "../api/client";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, login } = useAuth();
  const [currentYear, setCurrentYear] = useState(user?.selected_year || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "Student");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({ subjects: 0, unitsCompleted: 0, totalTime: 0 });
  
  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(false);
  
  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  
  // Email change modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Fetch user profile and stats on mount
  // Helper: filter subjects by user's selected year
  const filterSubjectsByYear = (subs) => {
    if (!user?.selected_year) return subs;
    const yearToSemesters = {
      '1st Year': ['1', '2', '1st year'],
      '2nd Year': ['3', '4', '2nd year']
    };
    const valid = (yearToSemesters[user.selected_year] || []).map(s => String(s).trim().toLowerCase());
    return subs.filter(s => valid.includes(String(s.semester || '').trim().toLowerCase()));
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [profileRes, subjectsRes] = await Promise.all([
          client.get('/api/auth/me'),
          client.get('/api/subjects', { params: { userOnly: 'true' } })
        ]);
        
        setProfileData(profileRes.data);
        setEditName(profileRes.data.name || "Student");
        setCurrentYear(profileRes.data.selected_year || '');
        setEmailNotifications(profileRes.data.email_notifications ?? true);
        setAnalyticsSharing(profileRes.data.analytics_sharing ?? false);
        
        // Calculate stats from subjects, filtered by selected year
        const subjects = filterSubjectsByYear(subjectsRes.data || []);
        const subjectsWithProgress = await Promise.all(
          subjects.map(async (subject) => {
            try {
              const progressRes = await client.get(`/api/subjects/${subject.id}/progress`);
              return {
                completed: progressRes.data.completed_units || 0
              };
            } catch {
              return { completed: 0 };
            }
          })
        );
        
        const totalUnits = subjectsWithProgress.reduce((sum, s) => sum + s.completed, 0);
        setStats({
          subjects: subjects.length,
          unitsCompleted: totalUnits,
          totalTime: 0 // Will be updated when backend tracking is ready
        });
        
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user?.selected_year]);

  // Update preferences on toggle
  const updatePreferences = async (payload) => {
    try {
      const res = await client.put('/api/auth/preferences', payload);
      const updatedUser = { ...user, ...res.data };
      // persist in auth store
      login(localStorage.getItem('sv_token'), updatedUser);
      setProfileData(res.data);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      alert('Failed to update preferences');
    }
  };

  const userEmail = profileData?.email || user?.email || "user@example.com";
  const userName = profileData?.name || user?.name || "Student";
  const joinedDate = profileData?.created_at 
    ? new Date(profileData.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const handleSaveName = async () => {
    try {
      await client.put('/api/auth/profile', { name: editName });
      setIsEditing(false);
      setProfileData({ ...profileData, name: editName });
    } catch (err) {
      console.error("Failed to update name:", err);
      alert("Failed to update name. Please try again.");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await client.put('/api/auth/password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      alert('Password updated successfully!');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const handleEmailChange = async () => {
    setEmailError('');
    
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Please enter a valid email');
      return;
    }
    
    try {
      await client.put('/api/auth/email', { email: newEmail });
      setProfileData({ ...profileData, email: newEmail });
      setShowEmailModal(false);
      setNewEmail('');
      alert('Email updated successfully!');
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Failed to update email');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }
    
    try {
      await client.delete('/api/auth/account');
      logout();
      navigate('/');
    } catch (err) {
      alert('Failed to delete account. Please try again.');
    }
  };

  const handleDownloadData = async () => {
    try {
      const res = await client.get('/api/auth/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scholarvault-data-${new Date().toISOString()}.json`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download data. Please try again.');
    }
  };

  const handleYearChange = async (year) => {
    try {
      await client.put('/api/auth/preferences', { selected_year: year });
      setCurrentYear(year);
      const updatedUser = { ...user, selected_year: year };
      login(localStorage.getItem('sv_token'), updatedUser);
    } catch (err) {
      console.error('Failed to update year:', err);
      alert('Failed to update year. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 mb-4 sm:mb-6 md:mb-8">
          Profile Settings
        </h1>

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg overflow-hidden mb-4 sm:mb-6 md:mb-8 border border-slate-200 hover:shadow-2xl transition-all duration-300">
          <div className="h-24 sm:h-32 md:h-40 bg-linear-to-r from-indigo-600 via-blue-600 to-indigo-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-300 rounded-full mix-blend-overlay blur-3xl"></div>
            </div>
          </div>

          <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 md:pb-10">
            {/* Avatar & Name Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 md:gap-8 -mt-12 sm:-mt-16 md:-mt-20 relative z-10 mb-4 sm:mb-6 md:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl sm:rounded-2xl bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold shadow-2xl border-2 sm:border-4 border-white hover:scale-105 transition-transform duration-300">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 w-full">
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl sm:text-2xl md:text-3xl font-bold outline-none border-b-2 border-indigo-600 focus:border-indigo-500 pb-2 flex-1 transition-colors"
                      placeholder="Your name"
                    />
                    <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleSaveName}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-indigo-500 transition-all duration-200 text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(userName);
                      }}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 border-2 border-slate-300 rounded-lg sm:rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 text-xs sm:text-sm"
                    >
                      Cancel
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{userName}</h2>
                      <p className="text-slate-500 text-xs sm:text-sm mt-1 sm:mt-2 font-medium">📅 Member since {joinedDate}</p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                    >
                      ✏️ Edit Name
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Email Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-xl sm:text-2xl border border-indigo-100 shrink-0">
                ✉️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 mb-1">Email Address</h3>
                <p className="text-slate-600 text-xs sm:text-sm mb-2 sm:mb-3 truncate">{userEmail}</p>
                <button 
                  onClick={() => setShowEmailModal(true)}
                  className="text-indigo-600 text-xs sm:text-sm font-medium hover:text-indigo-500 transition-colors"
                >
                  Change Email →
                </button>
              </div>
            </div>
          </div>

          {/* Password Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-xl sm:text-2xl border border-indigo-100 shrink-0">
                🔒
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 mb-1">Password</h3>
                <p className="text-slate-600 text-xs sm:text-sm mb-2 sm:mb-3">••••••••</p>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="text-indigo-600 text-xs sm:text-sm font-medium hover:text-indigo-500 transition-colors"
                >
                  Change Password →
                </button>
              </div>
            </div>
          </div>

          {/* Study Stats */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 flex items-center justify-center text-2xl border border-green-100">
                📊
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base text-slate-900 mb-1">Study Statistics</h3>
                <p className="text-slate-600 text-sm mb-3">{stats.subjects} subjects • {stats.unitsCompleted} units completed</p>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-indigo-600 text-sm font-medium hover:text-indigo-500 transition-colors"
                >
                  View Dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 border border-slate-200">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 sm:mb-6">Preferences</h3>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Academic Year Selection */}
            <div className="pb-4 sm:pb-6 border-b border-slate-200">
              <div className="mb-3 sm:mb-4">
                <p className="font-medium text-sm sm:text-base text-slate-900">Academic Year</p>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">Select your current year to filter relevant subjects</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((yearOption) => (
                    <button
                      key={yearOption}
                      onClick={() => handleYearChange(yearOption)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        currentYear === yearOption
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 hover:border-indigo-300 text-slate-700'
                      }`}
                    >
                      {yearOption}
                    </button>
                  ))}
                </div>
                <p className="text-slate-600 text-xs sm:text-sm">Current selection: {currentYear || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div>
                <p className="font-medium text-base text-slate-900">Email Notifications</p>
                <p className="text-slate-600 text-sm mt-1">Receive updates about your studies</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={emailNotifications}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setEmailNotifications(next);
                    updatePreferences({ email_notifications: next });
                  }}
                />
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform peer-checked:translate-x-7"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-base text-slate-900">Analytics Sharing</p>
                <p className="text-slate-600 text-sm mt-1">Help us improve by sharing usage data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={analyticsSharing}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAnalyticsSharing(next);
                    updatePreferences({ analytics_sharing: next });
                  }}
                />
                <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform peer-checked:translate-x-7"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border-2 border-red-200">
          <h3 className="text-xl font-semibold text-red-600 mb-6 flex items-center gap-2">
            ⚠️ Danger Zone
          </h3>
          
          <div className="space-y-4">
            <button 
              onClick={handleDownloadData}
              className="w-full px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              📥 Download My Data
            </button>
            
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm hover:bg-red-500 hover:shadow-md transition-all duration-200"
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-4 sm:mb-6">Change Password</h3>
              
              {passwordError && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs sm:text-sm">
                  {passwordError}
                </div>
              )}
              
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm sm:text-base"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm sm:text-base"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm sm:text-base"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-all shadow-sm hover:shadow-md text-sm sm:text-base"
                >
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ current: '', new: '', confirm: '' });
                    setPasswordError('');
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Change Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 mb-4 sm:mb-6">Change Email</h3>
              
              {emailError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {emailError}
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  placeholder="Enter new email"
                />
                <p className="text-xs text-slate-500 mt-2">Current: {userEmail}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleEmailChange}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-all shadow-sm hover:shadow-md"
                >
                  Update Email
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setNewEmail('');
                    setEmailError('');
                  }}
                  className="px-6 py-3 border-2 border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-red-600 mb-3 sm:mb-4">Delete Account</h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6">
                This action is permanent and cannot be undone. All your data, notes, and progress will be deleted.
              </p>
              
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                  Type <span className="font-mono bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded text-xs sm:text-sm">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                  placeholder="DELETE"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  Delete My Account
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="px-6 py-3 border-2 border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
