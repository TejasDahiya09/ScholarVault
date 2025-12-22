import { supabase } from "../lib/services.js";

/**
 * Subjects Database Operations
 */
export const subjectsDB = {
  /**
   * Get all subjects
   */
  async getAll(filters = {}) {
    let query = supabase.from("subjects").select("*");

    if (filters.branch) query = query.eq("branch", filters.branch);
    if (filters.semester) query = query.eq("semester", filters.semester);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get subject by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || null;
  },

  /**
   * Create subject
   */
  async create(subjectData) {
    const { data, error } = await supabase
      .from("subjects")
      .insert([subjectData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create subject: ${error.message}`);
    }

    return data;
  },

  /**
   * Update subject
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subject: ${error.message}`);
    }

    return data;
  },

  /**
   * Get subject with resources (notes, books, pyqs, syllabus)
   * Filters from single notes table by S3 URL path patterns
   * Extracts unit numbers from filenames when not in database
   */
  async getWithResources(id) {
    const subject = await this.getById(id);
    if (!subject) return null;

    // Fetch all notes for this subject
    const { data: allNotes } = await supabase
      .from("notes")
      .select("*")
      .eq("subject_id", id)
      .order("created_at", { ascending: false });

    // Filter notes into categories based on S3 URL path patterns
    // S3 URLs typically follow: https://bucket.s3.region.amazonaws.com/path/to/file
    // Pattern examples:
    // - Notes: .../notes/...
    // - PyQs: .../pyqs/... or .../previous-years/...
    // - Syllabus: .../syllabus/...
    const notes = [];
    const pyqs = [];
    const syllabus = [];

    // Helper function to extract unit number from filename
    const extractUnitNumber = (fileName) => {
      if (!fileName) return null;
      // Match patterns like "Unit-1", "Unit_1", "unit 1", etc.
      const match = fileName.match(/[Uu]nit[_\-\s](\d+)/);
      return match ? parseInt(match[1]) : null;
    };

    if (allNotes) {
      allNotes.forEach(note => {
        const s3Url = (note.s3_url || "").toLowerCase();
        const fileName = (note.file_name || "").toLowerCase();
        
        // Extract unit number from filename if not in database
        let unitNum = note.unit_number;
        if (!unitNum) {
          unitNum = extractUnitNumber(note.file_name);
        }
        
        // Ensure unit_number is set for sorting
        const noteWithUnit = {
          ...note,
          unit_number: unitNum || note.unit_number
        };
        
        // Check if it's a syllabus by S3 path or filename patterns
        if (
          s3Url.includes("/syllabus/") || 
          fileName.includes("syllabus") ||
          fileName.includes("curriculum") ||
          fileName.includes("course outline") ||
          s3Url.includes("syllabus")
        ) {
          syllabus.push(noteWithUnit);
        }
        // Check if it's a PyQ by S3 path
        else if (
          s3Url.includes("/pyqs/") || 
          s3Url.includes("/previous-years/") || 
          s3Url.includes("/previous_years/") ||
          fileName.includes("pyq") || 
          fileName.includes("previous year") || 
          fileName.includes("pye")
        ) {
          pyqs.push(noteWithUnit);
        }
        // Check if it's a regular note by S3 path OR file doesn't match other categories
        else if (s3Url.includes("/notes/") || !s3Url.includes("/")) {
          notes.push(noteWithUnit);
        }
        // Fallback: treat as note if it doesn't match other categories
        else {
          notes.push(noteWithUnit);
        }
      });
    }

    // Helper function to sort by unit_number naturally
    const sortByUnit = (items) => {
      return items.sort((a, b) => {
        const unitA = a.unit_number || 999;
        const unitB = b.unit_number || 999;
        return unitA - unitB;
      });
    };

    // Fetch books
    const { data: books } = await supabase
      .from("books")
      .select("*")
      .eq("subject_id", id)
      .order("created_at", { ascending: false });

    return {
      ...subject,
      notes: sortByUnit(notes) || [],
      books: books || [],
      pyqs: sortByUnit(pyqs) || [],
      syllabus: sortByUnit(syllabus) || [],
      syllabus_text: subject.syllabus_text || null,
      syllabus_json: subject.syllabus_json || null,
    };
  },
};

export default subjectsDB;
