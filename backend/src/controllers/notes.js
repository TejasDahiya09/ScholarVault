import supabase from "../lib/services.js";
import { notesService } from "../services/notes.js";
import { aiService } from "../services/ai.js";
import bookmarksDB from "../db/bookmarks.js";
import progressDB from "../db/progress.js";
import Cache from "../utils/cache.js";

/**
 * Get all notes
 */
export const getAllNotes = async (req, res) => {
  try {
      const { data, error } = await supabase.supabase.from("notes").select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get notes by subject
 */
export const getNotesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const { data, error } = await supabase.supabase
      .from("notes")
        .select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at")
      .eq("subject_id", subjectId);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get single note by ID
 */
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase.supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get notes by unit
 */
export const getNotesByUnit = async (req, res) => {
  try {
    const { subjectId, unitNumber } = req.params;

    const { data, error } = await supabase.supabase
      .from("notes")
        .select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at")
      .eq("subject_id", subjectId)
      .eq("unit_number", parseInt(unitNumber));

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * AI Summary
 */
export const getSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await notesService.getNoteById(id);
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    // Use OCR text if available, otherwise use a placeholder
    const textToSummarize = note.ocr_text || `Document: ${note.file_name}. This is a study material from ${new Date(note.created_at).getFullYear()}.`;

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use streaming from AI service
    await aiService.generateSummaryStream(textToSummarize, res);
    
  } catch (err) {
    console.error("Summary error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * AI Ask Question
 */
export const askQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, useRag } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    
    const note = await notesService.getNoteById(id);
    if (!note?.ocr_text) {
      return res.status(400).json({ error: "No OCR text available for this note" });
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use streaming from AI service
    await aiService.askQuestionStream(note.ocr_text, question, useRag || false, res);
    
  } catch (err) {
    console.error("Ask question error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Get progress on note
 */
export const getProgress = async (req, res) => {
  try {
    res.json({ progress: 0, completed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mark note as completed
 */
export const markAsCompleted = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id: noteId } = req.params;
    const { subjectId, completed } = req.body;

    if (!subjectId) {
      return res.status(400).json({ error: "subjectId is required" });
    }

    let result;
    if (completed) {
      result = await progressDB.markNoteComplete(userId, noteId, subjectId);
    } else {
      result = await progressDB.unmarkNoteComplete(userId, noteId);
    }

    // Get updated subject completion status
    const status = await progressDB.getSubjectCompletionStatus(userId, subjectId);

    res.json({
      status: "success",
      note_completed: completed,
      subject_completion: status,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle bookmark for a note
 */
export const toggleBookmark = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id: noteId } = req.params;

    // Check if already bookmarked
    const isBookmarked = await bookmarksDB.isBookmarked(userId, noteId);

    let result;
    if (isBookmarked) {
      result = await bookmarksDB.removeBookmark(userId, noteId);
    } else {
      result = await bookmarksDB.addBookmark(userId, noteId);
    }

    res.json({
      status: "success",
      bookmarked: !isBookmarked,
      message: !isBookmarked ? "Bookmarked" : "Bookmark removed",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get notes metadata for client-side search
 * GET /api/notes/metadata
 * 
 * Performance optimized:
 * - Cached for 30 minutes (rarely changes)
 * - Returns only required fields (lightweight)
 * - Indexed query (fast database access)
 */
export const getNotesMetadata = async (req, res) => {
  try {
    const cacheKey = 'notes_metadata_all';
    
    const data = await Cache.notes.getOrSet(cacheKey, async () => {
      const { data, error } = await supabase.supabase
        .from("notes")
        .select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  getAllNotes,
  getNotesBySubject,
  getNoteById,
  getNotesByUnit,
  getSummary,
  askQuestion,
  markAsCompleted,
  toggleBookmark,
  getProgress,
  getNotesMetadata,
};
