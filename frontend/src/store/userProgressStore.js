import { create } from "zustand";

export const useUserProgressStore = create((set) => ({
  bookmarks: new Set(),
  completions: new Set(),

  // Reset all state (MUST be called on logout)
  reset: () => set({ bookmarks: new Set(), completions: new Set() }),

  hydrate: (bookmarks, completions) =>
    set({
      bookmarks: new Set(bookmarks),
      completions: new Set(completions),
    }),

  addBookmark: (id) =>
    set((s) => {
      const b = new Set(s.bookmarks);
      b.add(id);
      return { bookmarks: b };
    }),

  removeBookmark: (id) =>
    set((s) => {
      const b = new Set(s.bookmarks);
      b.delete(id);
      return { bookmarks: b };
    }),

  addCompletion: (id) =>
    set((s) => {
      const c = new Set(s.completions);
      c.add(id);
      return { completions: c };
    }),

  removeCompletion: (id) =>
    set((s) => {
      const c = new Set(s.completions);
      c.delete(id);
      return { completions: c };
    }),
}));
