/**
 * Completions API
 * 
 * DESIGN: Presence-based (row exists = completed)
 * NO toggle logic - explicit mark/unmark only
 */
import client from "./client";

export const completionsAPI = {
  /**
   * Get all completed note IDs for current user
   */
  async getCompletedNoteIds() {
    const { data } = await client.get("/api/completions");
    return data.completions || [];
  },

  /**
   * Get completion count
   */
  async getCompletionCount() {
    const { data } = await client.get("/api/completions/count");
    return data.count || 0;
  },

  /**
   * Mark note as completed (idempotent)
   */
  async markComplete(noteId, subjectId) {
    const { data } = await client.post("/api/completions", { noteId, subjectId });
    return data;
  },

  /**
   * Mark note as incomplete (remove completion)
   */
  async markIncomplete(noteId) {
    const { data } = await client.delete(`/api/completions/${noteId}`);
    return data;
  },
};

export default completionsAPI;
