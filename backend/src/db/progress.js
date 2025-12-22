import { supabase } from "../lib/services.js";

/**
 * Unit/Progress Database Operations
 */
export const progressDB = {
  /**
   * Get user progress for a unit
   */
  async getUserProgress(userId, unitId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .select("id, user_id, unit_id, is_completed, updated_at, completed_at")
      .eq("user_id", userId)
      .eq("unit_id", unitId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || null;
  },

  /**
   * Mark unit as completed
   */
  async markUnitComplete(userId, unitId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .upsert([
        {
          user_id: userId,
          unit_id: unitId,
          is_completed: true,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    return data;
  },

  /**
   * Reset unit progress
   */
  async resetUnitProgress(userId, unitId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .update({
        is_completed: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("unit_id", unitId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to reset progress: ${error.message}`);
    }

    return data;
  },

  /**
   * Get user's overall progress
   */
  async getUserOverallProgress(userId) {
    const { data, error } = await supabase
      .from("user_study_progress")
      .select("id, is_completed, unit_id")
      .eq("user_id", userId)
      .not("unit_id", "is", null);

    if (error) {
      throw new Error(`Failed to fetch progress: ${error.message}`);
    }

    const items = data || [];
    const completed = items.filter(p => p.is_completed).length;
    const total = items.length;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      items,
    };
  },

  /**
   * Mark a note as completed (adds/updates study progress)
   */
  async markNoteComplete(userId, noteId, subjectId) {
    // First, try to find existing record
    const { data: existing } = await supabase
      .from("user_study_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("note_id", noteId)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("user_study_progress")
        .update({
          is_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to mark note as complete: ${error.message}`);
      }
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("user_study_progress")
        .insert([
          {
            user_id: userId,
            subject_id: subjectId,
            note_id: noteId,
            is_completed: true,
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to mark note as complete: ${error.message}`);
      }
      result = data;
    }

    return result;
  },

  /**
   * Unmark a note as completed
   */
  async unmarkNoteComplete(userId, noteId) {
    // First, find the existing record
    const { data: existing } = await supabase
      .from("user_study_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .single();

    if (!existing) {
      // If no record exists, nothing to unmark
      return null;
    }

    const { data, error } = await supabase
      .from("user_study_progress")
      .update({
        is_completed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to unmark note as complete: ${error.message}`);
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
   * Get subject completion status
   * Only counts actual notes (not books, PYQs, or syllabus)
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
      
      // Exclude syllabus
      if (
        s3Url.includes("/syllabus/") || 
        fileName.includes("syllabus") ||
        fileName.includes("curriculum") ||
        fileName.includes("course outline") ||
        s3Url.includes("syllabus")
      ) {
        return false;
      }
      
      // Exclude PYQs
      if (
        s3Url.includes("/pyqs/") || 
        s3Url.includes("/previous-years/") || 
        s3Url.includes("/previous_years/") ||
        fileName.includes("pyq") || 
        fileName.includes("previous year") || 
        fileName.includes("pye")
      ) {
        return false;
      }
      
      // Include actual notes
      return true;
    });

    const totalNotes = actualNotes.length;

    // Get completed notes from progress table
    const { data: progressData, error: progressError } = await supabase
      .from("user_study_progress")
      .select("note_id, is_completed")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .eq("is_completed", true);

    if (progressError) {
      throw new Error(`Failed to fetch subject completion status: ${progressError.message}`);
    }

    const completedNotes = progressData?.length || 0;

    return {
      total_notes: totalNotes,
      completed_notes: completedNotes,
      percentage: totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0,
    };
  },
};

export default progressDB;
