import { supabase } from "../lib/services.js";

/**
 * Completions Database Operations
 * 
 * DESIGN: Presence-based (row exists = completed)
 * NO toggle logic - explicit add/remove only
 */
export const completionsDB = {
  /**
   * Get all completed note IDs for a user (optionally filtered by subject)
   */
  async getCompletedNoteIds(userId, subjectId = null) {
    let query = supabase
      .from("user_note_completions")
      .select("note_id")
      .eq("user_id", userId);
    
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch completions: ${error.message}`);
    return (data || []).map(r => r.note_id);
  },

  /**
   * Check if a note is completed
   */
  async isCompleted(userId, noteId) {
    const { data, error } = await supabase
      .from("user_note_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .maybeSingle();
    
    if (error) throw new Error(`Failed to check completion: ${error.message}`);
    return !!data;
  },

  /**
   * Mark note as completed (idempotent)
   * Uses INSERT with ON CONFLICT DO NOTHING
   */
  async markComplete(userId, noteId, subjectId) {
    const { error } = await supabase
      .from("user_note_completions")
      .upsert(
        {
          user_id: userId,
          note_id: noteId,
          subject_id: subjectId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,note_id", ignoreDuplicates: true }
      );
    
    if (error) throw new Error(`Failed to mark complete: ${error.message}`);
    return { completed: true };
  },

  /**
   * Mark note as incomplete (remove completion)
   * Uses DELETE - no error if already deleted
   */
  async markIncomplete(userId, noteId) {
    const { error } = await supabase
      .from("user_note_completions")
      .delete()
      .eq("user_id", userId)
      .eq("note_id", noteId);
    
    if (error) throw new Error(`Failed to mark incomplete: ${error.message}`);
    return { completed: false };
  },

  /**
   * Get completion count for a user (total completed notes)
   */
  async getTotalCompletedCount(userId) {
    const { count, error } = await supabase
      .from("user_note_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    
    if (error) throw new Error(`Failed to count completions: ${error.message}`);
    return count || 0;
  },

  /**
   * Get subject completion stats
   */
  async getSubjectProgress(userId, subjectId) {
    // Get total notes in subject (excluding PYQs/syllabus)
    const { data: allNotes, error: notesError } = await supabase
      .from("notes")
      .select("id, s3_url, file_name")
      .eq("subject_id", subjectId);
    
    if (notesError) throw new Error(`Failed to fetch notes: ${notesError.message}`);
    
    // Filter to actual study notes only
    const studyNotes = (allNotes || []).filter(note => {
      const url = (note.s3_url || "").toLowerCase();
      const name = (note.file_name || "").toLowerCase();
      const isPyq = url.includes("/pyqs/") || name.includes("pyq");
      const isSyllabus = url.includes("/syllabus/") || name.includes("syllabus");
      return !isPyq && !isSyllabus;
    });

    // Get completed notes for this subject
    const completedIds = await this.getCompletedNoteIds(userId, subjectId);
    const completedSet = new Set(completedIds);
    
    // Count completed study notes
    const completedCount = studyNotes.filter(n => completedSet.has(n.id)).length;
    const totalCount = studyNotes.length;
    const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return {
      total_notes: totalCount,
      completed_notes: completedCount,
      percentage,
      completed_note_ids: completedIds,
    };
  },

  /**
   * Get completions grouped by date (for progress analytics)
   * Returns Map<dateString, count>
   */
  async getCompletionsByDate(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString();

    const { data, error } = await supabase
      .from("user_note_completions")
      .select("completed_at")
      .eq("user_id", userId)
      .gte("completed_at", startStr);
    
    if (error) throw new Error(`Failed to fetch completions by date: ${error.message}`);
    
    const byDate = new Map();
    for (const row of data || []) {
      const dateStr = row.completed_at?.slice(0, 10);
      if (dateStr) {
        byDate.set(dateStr, (byDate.get(dateStr) || 0) + 1);
      }
    }
    return byDate;
  },
};

export default completionsDB;
