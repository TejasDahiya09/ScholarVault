/**
 * Completions API
 * 
 * DESIGN: Presence-based (row exists = completed)
 * Subject-scoped (only affect current subject's analytics)
 * Pessimistic updates only (backend-confirmed)
 */
import client from "./client";

export const completionsAPI = {
  /**
   * Get all completed note IDs for current user
   */
  async getCompletedNoteIds() {
    try {
      const { data } = await client.get("/api/completions");
      return data.completions || [];
    } catch (error) {
      console.error("Error fetching completed note IDs:", error);
      return [];
    }
  },

  /**
   * Get completion count
   */
  async getCompletionCount() {
    try {
      const { data } = await client.get("/api/completions/count");
      return data.count || 0;
    } catch (error) {
      console.error("Error fetching completion count:", error);
      return 0;
    }
  },

  /**
   * Mark note as completed (idempotent)
   */
  async markComplete(noteId, subjectId) {
    try {
      const { data } = await client.post("/api/completions", { noteId, subjectId });
      return data;
    } catch (error) {
      console.error("Error marking note as complete:", error);
      throw error;
    }
  },

  /**
   * Mark note as incomplete (remove completion)
   */
  async markIncomplete(noteId) {
    try {
      const { data } = await client.delete(`/api/completions/${noteId}`);
      return data;
    } catch (error) {
      console.error("Error marking note as incomplete:", error);
      throw error;
    }
  },
};

export default completionsAPI;