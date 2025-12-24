import { create } from 'zustand';
import client from '../api/client';

const useCompletion = create((set, get) => ({
  completedNotes: new Set(), // For NotesPage (IDs only)
  subjectProgress: {}, // For ProgressPage/Dashboard (subjectId: {progress, completed, total})
  loading: false,
  error: null,

  // Fetch completed notes for a subject
  fetchCompletedNotes: async (subjectId) => {
    set({ loading: true, error: null });
    try {
      const res = await client.get(`/api/subjects/${subjectId}/progress`);
      const completedIds = res.data?.completed_note_ids || [];
      set({ completedNotes: new Set(completedIds), loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },

  // Fetch all subject progress (for ProgressPage/Dashboard)
  fetchAllSubjectProgress: async () => {
    set({ loading: true, error: null });
    try {
      const subjectsRes = await client.get('/api/subjects', { params: { userOnly: 'true' } });
      const allSubjects = subjectsRes.data || [];
      const progressData = {};
      await Promise.all(
        allSubjects.map(async (subject) => {
          try {
            const completionRes = await client.get(`/api/subjects/${subject.id}/progress`);
            progressData[subject.id] = {
              progress: completionRes.data?.progress_percent || 0,
              completed: completionRes.data?.completed_units || 0,
              total: completionRes.data?.total_units || 0,
              completed_note_ids: completionRes.data?.completed_note_ids || [],
            };
          } catch {}
        })
      );
      set({ subjectProgress: progressData, loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },

  // Mark note as complete/incomplete and refresh state
  toggleComplete: async (noteId, subjectId, completed) => {
    set({ loading: true, error: null });
    try {
      await client.post(`/api/notes/${noteId}/complete`, { subjectId, completed });
      // Refresh both completed notes and all subject progress
      await Promise.all([
        get().fetchCompletedNotes(subjectId),
        get().fetchAllSubjectProgress()
      ]);
      set({ loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },
}));

export default useCompletion;
