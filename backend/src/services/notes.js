import notesDB from "../db/notes.js";
import subjectsDB from "../db/subjects.js";
import aiService from "./ai.js";

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
   * Get note summary
   */
  async getNotesSummary(noteId) {
    const note = await notesDB.getById(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    if (!note.ocr_text) {
      throw new Error("No OCR text available for this note");
    }

    const summary = await aiService.generateSummary(note.ocr_text);
    return {
      noteId,
      title: note.file_name,
      summary,
    };
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

    const answer = await aiService.askQuestion(note.ocr_text, question, useRag);
    return {
      noteId,
      question,
      answer,
      usedRag: useRag,
    };
  },

  /**
   * Mark note as completed
   */
  async markAsCompleted(noteId, userId) {
    // This would typically involve a user_progress table
    // For now, just return success
    return {
      noteId,
      userId,
      completed: true,
      completedAt: new Date(),
    };
  },

  /**
   * Get user progress for note
   */
  async getProgress(noteId, userId) {
    // Would query user_progress table
    return {
      noteId,
      userId,
      progress: 0,
      completed: false,
    };
  },
};

export default notesService;
