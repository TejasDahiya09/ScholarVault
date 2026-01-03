import { supabase } from "../lib/services.js";
import { assertNoError } from "./assertWrite.js";

/**
 * Progress Database Operations
 * Uses user_study_progress table for note-level completion tracking
 * 
 * Copilot:
 * Use atomic RPC for toggles (eliminates race conditions).
 * RPC function: toggle_completion(p_user_id, p_note_id, p_subject_id)
 * Returns: boolean (TRUE if completed, FALSE if incomplete)
 * Fallback to application logic if RPC not available.
 */

// Feature flag: Use RPC-based atomic toggles
const USE_RPC_TOGGLES = true;

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
   * Toggle note completion status (ATOMIC via RPC)
   * Deterministic logic: Database-side atomic operation
   */
  async toggleCompletion(userId, noteId, subjectId) {
    if (USE_RPC_TOGGLES) {
      // Atomic RPC implementation
      console.log("[PROGRESS RPC] Toggling:", { userId, noteId, subjectId });
      const { data, error } = await supabase.rpc("toggle_completion", {
        p_user_id: userId,
        p_note_id: noteId,
        p_subject_id: subjectId
      });

      assertNoError(error, `RPC toggle_completion for user ${userId} note ${noteId}`);
      console.log("[PROGRESS RPC] Success, completed:", data);
      
      // Audit log: Track completion changes
      const auditAction = data ? 'complete' : 'uncomplete';
      await supabase.rpc("log_audit_event", {
        p_user_id: userId,
        p_entity_type: 'completion',
        p_entity_id: noteId,
        p_action: auditAction,
        p_metadata: JSON.stringify({ subject_id: subjectId })
      }).catch(err => {
        // Audit logging failure should not break the operation
        console.error("[AUDIT] Failed to log completion event:", err);
      });
      
      // Return in same format as before for backward compatibility
      return { is_completed: data };
    }

    // Fallback: Original application-side logic
    const { data: existing, error: fetchError } = await supabase
      .from("user_study_progress")
      .select("id, is_completed")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch progress: ${fetchError.message}`);
    }

    const newValue = existing ? !existing.is_completed : true;

    if (existing) {
      console.log("[PROGRESS] Updating:", { userId, noteId, newValue });
      const { data, error } = await supabase
        .from("user_study_progress")
        .update({
          is_completed: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();

      assertNoError(error, `Update completion for user ${userId} note ${noteId}`);
      console.log("[PROGRESS] Updated successfully");
      return data;
    } else {
      console.log("[PROGRESS] Inserting:", { userId, noteId, subjectId });
      const { data, error } = await supabase
        .from("user_study_progress")
        .insert({
          user_id: userId,
          note_id: noteId,
          subject_id: subjectId,
          is_completed: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      assertNoError(error, `Insert progress for user ${userId} note ${noteId}`);
      console.log("[PROGRESS] Inserted successfully");
      return data;
    }
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
