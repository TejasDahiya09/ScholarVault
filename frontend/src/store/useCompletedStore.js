import { create } from "zustand";
import client from "../api/client";

/**
 * Zustand store for completed notes
 * - Caches completed note IDs per subject
 * - Handles optimistic updates and rollback
 * - Prevents duplicate API calls
 * - Exposes selectors for components
 */
const useCompletedStore = create((set, get) => ({
  // subjectId -> Set<noteId>
  completedBySubject: {},

  // Reset all state (MUST be called on logout)
  reset: () => set({ completedBySubject: {} }),

  getCompletedNoteIds: (subjectId) =>
    get().completedBySubject[subjectId] ?? new Set(),

  isNoteCompleted: (noteId, subjectId) => {
    const setForSubject = get().completedBySubject[subjectId];
    return setForSubject ? setForSubject.has(noteId) : false;
  },

  fetchCompletedNotes: async (subjectId) => {
    if (!subjectId) return;
    if (get().completedBySubject[subjectId]) return;
    try {
      const { data } = await client.get(
        `/api/completed?subjectId=${subjectId}`
      );
      set((state) => ({
        completedBySubject: {
          ...state.completedBySubject,
          [subjectId]: new Set(data.map((n) => n.note_id)),
        },
      }));
    } catch {
      throw new Error("Failed to load completed notes");
    }
  },

  toggleCompleted: async (noteId, subjectId) => {
    if (!subjectId) return;
    const previous = get().completedBySubject[subjectId] ?? new Set();
    const optimistic = new Set(previous);
    const wasCompleted = optimistic.has(noteId);
    wasCompleted ? optimistic.delete(noteId) : optimistic.add(noteId);
    set((state) => ({
      completedBySubject: {
        ...state.completedBySubject,
        [subjectId]: optimistic,
      },
    }));
    try {
      await client.post("/api/completed/toggle", {
        noteId,
        subjectId,
      });
    } catch {
      set((state) => ({
        completedBySubject: {
          ...state.completedBySubject,
          [subjectId]: previous,
        },
      }));
      throw new Error("Toggle failed");
    }
  },
}));

export default useCompletedStore;
