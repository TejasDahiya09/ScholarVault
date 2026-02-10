import { supabase } from "../lib/services.js";

// Completions DB helpers (contract-compliant)
const completionsDB = {
  // Get all completed note IDs for a user, optionally filtered by subjectId
  async getCompletedNoteIds(userId, subjectId = null) {
    let query = supabase
      .from("completions")
      .select("note_id")
      .eq("user_id", userId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(r => r.note_id);
  },

  // Get total completed notes count for a user
  async getTotalCompletedCount(userId) {
    const { data, error, count } = await supabase
      .from("completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    return count || 0;
  },

  // Mark note as completed
  async markComplete(userId, noteId) {
    const { error } = await supabase
      .from("completions")
      .insert({ user_id: userId, note_id: noteId });
    if (error) throw error;
    return { completed: true };
  },

  // Mark note as incomplete
  async markIncomplete(userId, noteId) {
    const { error } = await supabase
      .from("completions")
      .delete()
      .eq("user_id", userId)
      .eq("note_id", noteId);
    if (error) throw error;
    return { completed: false };
  },

  // ...existing code...

  // Get completions by date for analytics
  async getCompletionsByDate(userId, days = 30) {
    // Returns a Map of date string (YYYY-MM-DD) -> count
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const { data, error } = await supabase
      .from("completions")
      .select("completed_at")
      .eq("user_id", userId)
      .gte("completed_at", since.toISOString().slice(0, 10));
    if (error) throw error;
    const map = new Map();
    (data || []).forEach(row => {
      const date = row.completed_at?.slice(0, 10);
      if (date) map.set(date, (map.get(date) || 0) + 1);
    });
    return map;
  },
};

export default completionsDB;
