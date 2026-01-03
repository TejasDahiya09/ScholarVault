import { supabase } from "../lib/services.js";

/**
 * Progress Database Operations
 * Uses user_study_progress table for note-level completion tracking
 */
export const progressDB = {

  /**
   * Mark a note as completed
   * Updates user_study_progress with completion status
   */

  /**
   * Set note completion status (atomic upsert)
   */
  async setNoteCompletion(userId, noteId, subjectId, completed) {
    // Try upsert for atomicity
    const { data, error } = await supabase
      .from("user_study_progress")
      .upsert([
        {
          user_id: userId,
          subject_id: subjectId,
          note_id: noteId,
          is_completed: completed,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: ["user_id", "note_id"] })
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to set note completion: ${error.message}`);
    }
    return data;
  },

  /**
   * Check if note is completed
   */
  async isNoteCompleted(userId, noteId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .select("is_completed")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Database error: ${error.message}`);
    }

    return data?.is_completed || false;
  },

  /**
   * Get completed notes for a subject
   */
  async getCompletedNotes(userId, subjectId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .select("note_id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_completed", true);

    if (error) {
      throw new Error(`Failed to fetch completed notes: ${error.message}`);
    }

    return data?.map(p => p.note_id) || [];
  },

  /**
   * Get subject completion percentage
   * Counts completed notes from user_study_progress vs total actual notes
   * Excludes PYQs, syllabus, and reference materials
   */
  async getSubjectCompletionStatus(userId, subjectId) {
    // Get all notes for the subject
    const { data: allNotes, error: notesError } = await supabase
      .from("notes")
      .select("id, s3_url, file_name")
      .eq("subject_id", subjectId);

    if (notesError) {
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    // Filter to only count actual notes (not PYQs, syllabus)
    // Match the same logic as getWithResources in subjects.js
    const actualNotes = (allNotes || []).filter(note => {
      const s3Url = (note.s3_url || "").toLowerCase();
      const fileName = (note.file_name || "").toLowerCase();
      // Mark as completed feature removed
      // Add your filter logic here or return true for all notes
      return true;
    });

    // Add logic to calculate completion percentage if needed
    return {
      totalNotes: actualNotes.length,
      completedNotes: 0 // Placeholder, update with actual completed notes logic
    };
  }
};
export default progressDB;
