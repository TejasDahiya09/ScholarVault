import supabase from "../lib/services.js";
import { notesService } from "../services/notes.js";
// ...existing code...

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
      // ...existing code...
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();
    res.write(':streaming-start\n\n');

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
 * Get notes metadata for client-side search
 * GET /api/notes/metadata
 */
export const getNotesMetadata = async (req, res) => {
  try {
    const { data, error } = await supabase.supabase
      .from("notes")
      .select("id, file_name, subject, subject_id, unit_number, semester, branch, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  getAllNotes,
  getNotesBySubject,
  getNoteById,
  askQuestion,
  getNotesMetadata,
};
