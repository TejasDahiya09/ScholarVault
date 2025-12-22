import supabase from "../lib/services.js";
import config from "../config.js";
import mime from "mime-types";
import { notesService } from "../services/notes.js";
import { aiService } from "../services/ai.js";
import bookmarksDB from "../db/bookmarks.js";
import progressDB from "../db/progress.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Initialize S3 client once
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

/**
 * Extract bucket and key from a public S3 URL
 * Supports both virtual-hosted and path-style URLs
 */
function parseS3Url(s3Url = "") {
  try {
    const url = new URL(s3Url);
    const host = url.hostname; // e.g., my-bucket.s3.amazonaws.com or s3.us-east-1.amazonaws.com
    const pathname = url.pathname.replace(/^\//, "");

    // Virtual-hosted–style: <bucket>.s3.<region>.amazonaws.com/<key>
    const vhMatch = host.match(/^(?<bucket>[^.]+)\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$/i);
    if (vhMatch && vhMatch.groups?.bucket) {
      return { bucket: vhMatch.groups.bucket, key: pathname };
    }

    // Path-style: s3.<region>.amazonaws.com/<bucket>/<key>
    const pathStyle = host.match(/^s3([.-][a-z0-9-]+)?\.amazonaws\.com$/i);
    if (pathStyle) {
      const [bucket, ...rest] = pathname.split("/");
      return { bucket, key: rest.join("/") };
    }

    // Fallback: try common pattern split
    const parts = s3Url.split(".amazonaws.com/");
    if (parts.length === 2) {
      const left = parts[0];
      const bucket = left.split("//").pop()?.split(".s3")[0];
      const key = parts[1];
      if (bucket && key) return { bucket, key };
    }
  } catch (e) {
    // ignore and fallthrough
  }
  return { bucket: config.S3_BUCKET || process.env.S3_BUCKET_NAME || "", key: "" };
}

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
    // HEAD support for PDF viewers
    if (req.method === "HEAD") {
      return res.sendStatus(200);
    }

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

    // Determine content type and streaming headers
    const contentType = detectContentType(s3Url);
    const isPDF = contentType === "application/pdf";

    // Resolve bucket and key from the stored URL
    const { bucket, key } = parseS3Url(s3Url);
    if (!bucket || !key) {
      return res.status(500).json({ error: "Invalid S3 URL" });
    }

    // Headers for inline view (set BEFORE streaming)
    res.status(200);
    res.setHeader("Content-Type", isPDF ? "application/pdf" : contentType);
    res.setHeader("Content-Disposition", `inline; filename="${(document.file_name || 'document')}${isPDF && !/(\.pdf)$/i.test(document.file_name || '') ? '.pdf' : ''}"`);
    res.setHeader("Accept-Ranges", "bytes");
    if (isPDF) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }

    // Stream from S3 via SDK if credentials are present; else fall back to HTTPS streaming
    const haveCreds = !!(config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY);
    try {
      if (haveCreds) {
        const resp = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (resp.ContentLength) {
          res.setHeader("Content-Length", String(resp.ContentLength));
        }
        console.log("Serving PDF (SDK):", { noteId: req.params.id, key });
        const stream = resp.Body; // Node Readable
        stream.on("error", (err) => {
          console.error("PDF stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to stream PDF" });
          }
        });
        stream.pipe(res);
        return;
      } else {
        // Anonymous/public fetch fallback (no AWS creds)
        const fetchResp = await fetch(s3Url);
        if (!fetchResp.ok) {
          throw new Error(`Fetch fallback failed with status ${fetchResp.status}`);
        }
        const len = fetchResp.headers.get("content-length");
        if (len) res.setHeader("Content-Length", len);
        console.log("Serving PDF (HTTPS fallback):", { noteId: req.params.id, key });
        // Node 18+: convert Web ReadableStream to Node Readable
        const nodeStream = Readable.fromWeb(fetchResp.body);
        nodeStream.on("error", (err) => {
          console.error("PDF fetch stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to stream PDF" });
          }
        });
        nodeStream.pipe(res);
        return;
      }
    } catch (innerErr) {
      console.error("Inline stream attempt failed:", innerErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to load document" });
      }
      return;
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
    const isPDF = contentType === "application/pdf";
    const fileNameBase = (document.file_name || 'document').replace(/\.[^.]+$/, '');

    // Resolve bucket/key
    const { bucket, key } = parseS3Url(s3Url);
    if (!bucket || !key) {
      return res.status(500).json({ error: "Invalid S3 URL" });
    }

    console.log("Streaming PDF:", key);

    // Headers for download
    res.setHeader("Content-Type", isPDF ? "application/pdf" : contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileNameBase}${isPDF ? '.pdf' : ''}"`);
    if (isPDF) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }

    // Stream via SDK if creds exist; otherwise HTTPS fallback
    const haveCreds = !!(config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY);
    try {
      if (haveCreds) {
        const resp = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (resp.ContentLength) {
          res.setHeader("Content-Length", String(resp.ContentLength));
        }
        const stream = resp.Body;
        stream.on("error", (err) => {
          console.error("PDF stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to stream PDF" });
          }
        });
        stream.pipe(res);
        return;
      } else {
        const fetchResp = await fetch(s3Url);
        if (!fetchResp.ok) {
          throw new Error(`Fetch fallback failed with status ${fetchResp.status}`);
        }
        const len = fetchResp.headers.get("content-length");
        if (len) res.setHeader("Content-Length", len);
        const nodeStream = Readable.fromWeb(fetchResp.body);
        nodeStream.on("error", (err) => {
          console.error("PDF fetch stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to stream PDF" });
          }
        });
        nodeStream.pipe(res);
        return;
      }
    } catch (innerErr) {
      console.error("Download stream attempt failed:", innerErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download document" });
      }
      return;
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
