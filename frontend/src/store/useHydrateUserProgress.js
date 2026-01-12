import { useEffect } from "react";
import { useUserProgressStore } from "./userProgressStore";
import { bookmarksAPI } from "../api/bookmarks";
import { completionsAPI } from "../api/completions";
import useAuth from "./useAuth";

export function useHydrateUserProgress() {
  const token = useAuth((s) => s.token);
  useEffect(() => {
    if (!token) return;
    Promise.all([
      bookmarksAPI.getBookmarkedNoteIds(),
      completionsAPI.getCompletedNoteIds(),
    ]).then(([b, c]) => {
      useUserProgressStore.getState().hydrate(b, c);
    });
  }, [token]);
}
