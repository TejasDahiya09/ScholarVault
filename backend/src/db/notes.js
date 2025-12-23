import { supabase } from "../lib/services.js";
import { cacheQuery, invalidateCache } from "../utils/cache.js";

/**
 * Notes Database Operations
 */
export const notesDB = {
  /**
   * Get all notes
   */
  async getAll(filters = {}) {
    const cacheKey = `notes:all:${JSON.stringify(filters)}`;
    
    return cacheQuery(cacheKey, async () => {
      let query = supabase.from("notes").select("id, file_name, subject, subject_id, unit_number, semester, branch, s3_url, created_at");

      if (filters.branch) query = query.eq("branch", filters.branch);
      if (filters.semester) query = query.eq("semester", filters.semester);
      if (filters.subject) query = query.eq("subject", filters.subject);
      if (filters.subject_id) query = query.eq("subject_id", filters.subject_id);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch notes: ${error.message}`);
      }

      return data || [];
    });
  },

  /**
   * Get note by ID
   */
  async getById(id) {
    const cacheKey = `notes:${id}`;
    
    return cacheQuery(cacheKey, async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    });
  },

  /**
   * Get notes by subject_id and optionally unit_number
   */
  async getBySubjectId(subjectId, unitNumber = null) {
    let query = supabase
      .from("notes")
      .select("*")
      .eq("subject_id", subjectId);
    
    if (unitNumber !== null) {
      query = query.eq("unit_number", unitNumber);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch unit notes: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get all notes for a subject (all units)
   */
  async getAllBySubjectId(subjectId) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("subject_id", subjectId)
      .order("unit_number", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Create a new note
   */
  async create(noteData) {
    const { data, error } = await supabase
      .from("notes")
      .insert([noteData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }

    return data;
  },

  /**
   * Update note
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete note
   */
  async delete(id) {
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }

    return true;
  },
};

export default notesDB;
