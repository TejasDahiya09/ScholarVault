import { supabase } from "../lib/services.js";

// Completions DB helpers (contract-compliant)
const completionsDB = {
  // Get all completed note IDs for a user
  async getCompletedNoteIds(userId) {
    const { data, error } = await supabase
      .from("completions")
      .select("note_id")
      .eq("user_id", userId);
    if (error) throw error;
    return (data || []).map(r => r.note_id);
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

  // Get subject progress for a user and subject
  async getSubjectProgress(userId, subjectId) {
    // Return progress stats for a subject for this user
    // Example: { progress_percent: 80, completed_units: 8, total_units: 10 }
    // You may need to adjust table/column names as per your schema
    const { data: completed, error: completedError } = await supabase
      .from("completions")
      .select("note_id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);
    if (completedError) throw completedError;
    const { data: total, error: totalError } = await supabase
      .from("notes")
      .select("id")
      .eq("subject_id", subjectId);
    if (totalError) throw totalError;
    const completedUnits = (completed || []).length;
    const totalUnits = (total || []).length;
    return {
      progress_percent: totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
      completed_units: completedUnits,
      total_units: totalUnits,
    };
  },

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
