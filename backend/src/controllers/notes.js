import supabase from "../lib/services.js";
import config from "../config.js";
import mime from "mime-types";
import { notesService } from "../services/notes.js";
import { aiService } from "../services/ai.js";
import bookmarksDB from "../db/bookmarks.js";
import progressDB from "../db/progress.js";

/**
 * Detect Content-Type using file extension
 */
function detectContentType(key = "") {
  const type = mime.lookup(key);
  return type || "application/octet-stream";
}

/**
 * Stream file inline (works for PDF, JPG, PNG, SVG)
 * Uses the S3 URL stored in database to fetch and serve files with inline disposition
 * Supports notes, books, pyqs, and syllabus
 * 
 * PERFORMANCE: Uses streaming for memory efficiency + aggressive caching for PDFs
 */
export const getFileInline = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch from all possible tables
    let document = null;
    let tableName = null;

    // Try notes table first
    const { data: note, error: noteError } = await supabase.supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (note && !noteError) {
      document = note;
      tableName = "notes";
    } else {
      // Try books table
      const { data: book, error: bookError } = await supabase.supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (book && !bookError) {
        document = book;
        tableName = "books";
      } else {
        // Try pyqs table
        const { data: pyq, error: pyqError } = await supabase.supabase
          .from("pyqs")
          .select("*")
          .eq("id", id)
          .single();

        if (pyq && !pyqError) {
          document = pyq;
          tableName = "pyqs";
        } else {
          // Try syllabus table
          const { data: syllabus, error: syllabusError } = await supabase.supabase
            .from("syllabus")
            .select("*")
            .eq("id", id)
            .single();

          if (syllabus && !syllabusError) {
            document = syllabus;
            tableName = "syllabus";
          }
        }
      }
    }

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const s3Url = document.s3_url;
    if (!s3Url) {
      return res.status(404).json({ error: "File URL not found" });
    }

    const contentType = detectContentType(s3Url);
    const isPDF = contentType === "application/pdf";

    console.log(`Serving ${tableName} file from S3:`, s3Url, "Content-Type:", contentType);

    try {
      // Fetch from S3 URL
      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`S3 fetch failed: ${response.statusText}`);
      }

      // Set inline disposition so browser displays instead of downloads
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${document.file_name || 'document'}"`);
      
      // AGGRESSIVE CACHING for PDFs: 1 year immutable (content is static)
      // Do NOT cache auth errors (handled by fetch failure above)
      if (isPDF) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }

      // Stream directly to client (memory efficient)
      response.body.pipe(res);

      // Handle stream errors
      response.body.on('error', (streamErr) => {
        console.error("Stream error:", streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream document" });
        } else {
          res.end();
        }
      });

    } catch (fetchErr) {
      console.error("Failed to fetch from S3:", fetchErr);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to load document" });
      } else {
        res.end();
      }
    }

  } catch (err) {
    console.error("❌ getFileInline failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to load document" });
    }
  }
};

/**
 * Generate signed URL for Open-In-New-Tab
 */
export const getFileSignedUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: note, error } = await supabase.supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !note)
      return res.status(404).json({ error: "Note not found" });

    const s3Url = note.s3_url;
    if (!s3Url)
      return res.status(404).json({ error: "File URL not found" });

    // Simply return the S3 URL as is (it's already public)
    res.json({ url: s3Url });

  } catch (err) {
    console.error("❌ Failed to generate signed URL:", err);
    res.status(500).json({ error: "Cannot generate signed URL" });
  }
};

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
 * Download file with proper Content-Disposition header
 * 
 * PERFORMANCE: Streams file directly from S3 without loading into memory
 * CACHING: Aggressive caching for PDFs (1 year immutable)
 */
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch from all possible tables
    let document = null;
    let tableName = null;

    // Try notes table first
    const { data: note, error: noteError } = await supabase.supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (note && !noteError) {
      document = note;
      tableName = "notes";
    } else {
      // Try books table
      const { data: book, error: bookError } = await supabase.supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (book && !bookError) {
        document = book;
        tableName = "books";
      } else {
        // Try pyqs table
        const { data: pyq, error: pyqError } = await supabase.supabase
          .from("pyqs")
          .select("*")
          .eq("id", id)
          .single();

        if (pyq && !pyqError) {
          document = pyq;
          tableName = "pyqs";
        } else {
          // Try syllabus table
          const { data: syllabus, error: syllabusError } = await supabase.supabase
            .from("syllabus")
            .select("*")
            .eq("id", id)
            .single();

          if (syllabus && !syllabusError) {
            document = syllabus;
            tableName = "syllabus";
          }
        }
      }
    }

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const s3Url = document.s3_url;
    if (!s3Url) {
      return res.status(404).json({ error: "File URL not found" });
    }

    const contentType = detectContentType(s3Url);
    const fileName = document.file_name || 'document';
    const isPDF = contentType === "application/pdf";

    console.log(`Downloading ${tableName} file from S3:`, s3Url);

    try {
      // Fetch from S3 URL
      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`S3 fetch failed: ${response.statusText}`);
      }

      // Set attachment disposition to force download
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      
      // AGGRESSIVE CACHING for PDFs: 1 year immutable
      if (isPDF) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }

      // Stream directly from S3 to client (memory efficient)
      response.body.pipe(res);

      // Handle stream errors
      response.body.on('error', (streamErr) => {
        console.error("Download stream error:", streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        } else {
          res.end();
        }
      });

    } catch (fetchErr) {
      console.error("Failed to fetch from S3:", fetchErr);
      return res.status(500).json({ error: "Failed to download file from S3" });
    }

  } catch (err) {
    console.error("❌ downloadFile failed:", err);
    res.status(500).json({ error: "Failed to download document" });
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
  getFileInline,
  getFileSignedUrl,
  downloadFile,
};
