import { useEffect } from "react";
import { useUserProgressStore } from "./userProgressStore";
import { bookmarksAPI } from "../api/bookmarks";
import { completionsAPI } from "../api/completions";

export function useHydrateUserProgress() {
  useEffect(() => {
    Promise.all([
      bookmarksAPI.getBookmarkedNoteIds(),
      completionsAPI.getCompletedNoteIds(),
    ]).then(([b, c]) => {
      useUserProgressStore.getState().hydrate(b, c);
    });
  }, []);
}
