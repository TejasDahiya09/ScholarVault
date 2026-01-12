
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
};

export default completionsDB;
