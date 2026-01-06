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

    // Filter to only count actual notes (exclude PYQs/syllabus if needed)
    const actualNotes = (allNotes || []).filter(note => {
      const s3Url = (note.s3_url || "").toLowerCase();
      const fileName = (note.file_name || "").toLowerCase();
      // Treat everything as a note unless clearly marked as syllabus or pyq
      const isSyllabus = s3Url.includes("/syllabus/") || fileName.includes("syllabus");
      const isPyq = s3Url.includes("/pyqs/") || fileName.includes("pyq") || fileName.includes("previous year");
      return !isSyllabus && !isPyq;
    });

    // Fetch completed notes for the user/subject
    const { data: completedRows, error: completedError } = await supabase
      .from("user_study_progress")
      .select("note_id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_completed", true);

    if (completedError) {
      throw new Error(`Failed to fetch completed notes: ${completedError.message}`);
    }

    const completedSet = new Set((completedRows || []).map(r => r.note_id));
    const totalNotes = actualNotes.length;
    const completedNotes = actualNotes.filter(n => completedSet.has(n.id)).length;
    const percentage = totalNotes === 0 ? 0 : Math.round((completedNotes / totalNotes) * 100);

    return {
      total_notes: totalNotes,
      completed_notes: completedNotes,
      percentage,
    };
  }
};
export default progressDB;
