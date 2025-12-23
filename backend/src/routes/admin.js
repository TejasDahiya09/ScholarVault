import express from "express";
import { supabase } from "../lib/services.js";
import aiService from "../services/ai.js";

const router = express.Router();

/**
 * Admin Endpoint: Generate embeddings for all notes
 * This endpoint processes all notes and generates vector embeddings
 * for semantic search functionality
 * 
 * Usage: POST /api/admin/embed-all
 * 
 * WARNING: This can take a long time for large datasets!
 * Consider running in batches or as a background job
 */
router.post("/embed-all", async (req, res) => {
  try {
    // Get all notes with OCR text
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, file_name, ocr_text")
      .eq("is_ocr_done", true)
      .not("ocr_text", "is", null);

    if (notesError) {
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      return res.json({
        success: true,
        message: "No notes with OCR text found",
        processed: 0,
        total: 0,
      });
    }

    console.log(`Starting embedding generation for ${notes.length} notes...`);

    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    const CHUNK_SIZE = 500; // Characters per chunk

    for (let i = 0; i < notes.length; i += BATCH_SIZE) {
      const batch = notes.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (note) => {
          try {
            if (!note.ocr_text || note.ocr_text.trim().length === 0) {
              return;
            }

            // Delete existing chunks for this note
            await supabase
              .from("document_chunks")
              .delete()
              .eq("note_id", note.id);

            // Split text into chunks
            const text = note.ocr_text;
            const chunks = [];
            
            for (let start = 0; start < text.length; start += CHUNK_SIZE) {
              const chunk = text.substring(start, start + CHUNK_SIZE);
              if (chunk.trim().length > 50) { // Skip very small chunks
                chunks.push({
                  text: chunk,
                  position: chunks.length,
                });
              }
            }

            if (chunks.length === 0) {
              return;
            }

            // Generate embeddings for all chunks
            const texts = chunks.map(c => c.text);
            const embeddings = await aiService.generateEmbeddings(texts);

            // Insert chunks with embeddings
            const chunksToInsert = chunks.map((chunk, idx) => ({
              note_id: note.id,
              embedding: Array.from(embeddings[idx].data),
              position: chunk.position,
            }));

            const { error: insertError } = await supabase
              .from("document_chunks")
              .insert(chunksToInsert);

            if (insertError) {
              throw insertError;
            }

            processedCount++;
            console.log(`✓ Processed ${processedCount}/${notes.length}: ${note.file_name}`);
          } catch (err) {
            errorCount++;
            errors.push({
              note_id: note.id,
              file_name: note.file_name,
              error: err.message,
            });
            console.error(`✗ Error processing ${note.file_name}:`, err.message);
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < notes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      message: "Embedding generation complete",
      total: notes.length,
      processed: processedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error("Embed all error:", err);
    res.status(500).json({
      error: err.message || "Failed to generate embeddings",
    });
  }
});

/**
 * Get embedding status for all notes
 * Shows which notes have embeddings and which don't
 */
router.get("/embedding-status", async (req, res) => {
  try {
    // Get total notes with OCR
    const { count: totalNotes, error: countError } = await supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("is_ocr_done", true)
      .not("ocr_text", "is", null);

    if (countError) {
      throw new Error(`Failed to count notes: ${countError.message}`);
    }

    // Get notes with embeddings
    const { data: notesWithEmbeddings, error: embeddingsError } = await supabase
      .from("document_chunks")
      .select("note_id")
      .limit(10000); // High limit to get all

    if (embeddingsError) {
      throw new Error(`Failed to fetch embeddings: ${embeddingsError.message}`);
    }

    const uniqueNotesWithEmbeddings = new Set(
      notesWithEmbeddings.map(c => c.note_id)
    );

    res.json({
      total_notes_with_ocr: totalNotes || 0,
      notes_with_embeddings: uniqueNotesWithEmbeddings.size,
      notes_without_embeddings: (totalNotes || 0) - uniqueNotesWithEmbeddings.size,
      coverage_percentage:
        totalNotes > 0
          ? Math.round((uniqueNotesWithEmbeddings.size / totalNotes) * 100)
          : 0,
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({
      error: err.message || "Failed to check embedding status",
    });
  }
});

/**
 * Regenerate embeddings for a single note
 * Useful for testing or fixing specific notes
 */
router.post("/embed-note/:noteId", async (req, res) => {
  try {
    const { noteId } = req.params;

    // Get note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, file_name, ocr_text")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (!note.ocr_text || note.ocr_text.trim().length === 0) {
      return res.status(400).json({ error: "Note has no OCR text" });
    }

    // Delete existing chunks
    await supabase.from("document_chunks").delete().eq("note_id", noteId);

    // Split into chunks
    const CHUNK_SIZE = 500;
    const text = note.ocr_text;
    const chunks = [];

    for (let start = 0; start < text.length; start += CHUNK_SIZE) {
      const chunk = text.substring(start, start + CHUNK_SIZE);
      if (chunk.trim().length > 50) {
        chunks.push({
          text: chunk,
          position: chunks.length,
        });
      }
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: "No valid chunks generated" });
    }

    // Generate embeddings
    const texts = chunks.map(c => c.text);
    const embeddings = await aiService.generateEmbeddings(texts);

    // Insert chunks
    const chunksToInsert = chunks.map((chunk, idx) => ({
      note_id: noteId,
      embedding: Array.from(embeddings[idx].data),
      position: chunk.position,
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunksToInsert);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    res.json({
      success: true,
      message: "Embeddings generated successfully",
      note_id: noteId,
      file_name: note.file_name,
      chunks_created: chunks.length,
    });
  } catch (err) {
    console.error("Embed note error:", err);
    res.status(500).json({
      error: err.message || "Failed to generate embeddings",
    });
  }
});

export default router;
