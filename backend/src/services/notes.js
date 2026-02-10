import notesDB from "../db/notes.js";
import subjectsDB from "../db/subjects.js";

/**
 * Notes Service
 */
export const notesService = {
  /**
   * Get all notes with optional filters
   */
  async getAllNotes(filters = {}) {
    return notesDB.getAll(filters);
  },

  /**
   * Get note by ID
   */
  async getNoteById(id) {
    const note = await notesDB.getById(id);
    if (!note) {
      throw new Error("Note not found");
    }
    return note;
  },

  /**
   * Get all notes for a subject
   */
  async getNotesBySubject(subjectId) {
    return notesDB.getAllBySubjectId(subjectId);
  },

  /**
   * Get notes for a subject unit
   */
  async getNotesByUnit(subjectId, unitNumber) {
    return notesDB.getBySubjectId(subjectId, unitNumber);
  },

  /**
   * Ask question about note
   */
  async askAboutNote(noteId, question, useRag = false) {
    const note = await notesDB.getById(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    if (!note.ocr_text) {
      throw new Error("No OCR text available for this note");
    }

    // ...existing code...
  },

  /**
   * Mark note as completed
   */
  async markAsCompleted(noteId, userId) {
    // ...existing code...
  },
};

export default notesService;
