import { create } from 'zustand';
import client from '../api/client';

const useBookmarks = create((set, get) => ({
  bookmarks: new Set(), // For NotesPage (IDs only)
  bookmarksDetails: [], // For Dashboard (detailed objects)
  loading: false,
  error: null,

  // Fetch only IDs (for NotesPage)
  fetchBookmarks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/api/bookmarks');
      set({ bookmarks: new Set(res.data?.bookmarks || []), loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },

  // Fetch details (for Dashboard)
  fetchBookmarksDetails: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/api/bookmarks/details');
      set({ bookmarksDetails: res.data?.bookmarks || [], loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },

  // Toggle bookmark and refresh both lists
  toggleBookmark: async (noteId) => {
    set({ loading: true, error: null });
    try {
      await client.post(`/api/notes/${noteId}/bookmark`);
      // Refresh both lists
      await Promise.all([
        get().fetchBookmarks(),
        get().fetchBookmarksDetails()
      ]);
      set({ loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },
}));

export default useBookmarks;
