import * as notesController from "../controllers/notes.js";
router.post("/:id/bookmark", notesController.toggleBookmark);
router.post("/:id/complete", notesController.markAsCompleted);
import { Router } from "express";
import notesController from "../controllers/notes.js";
import searchController from "../controllers/search.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Protect all note routes; notes are user data
router.use(authenticate);

/**
 * Notes Routes
 */
router.get("/", notesController.getAllNotes);
router.get("/metadata", notesController.getNotesMetadata); // Metadata for client-side search

// Specific routes must come before parameterized routes
router.get("/subjects/:subjectId", notesController.getNotesBySubject);
router.get("/subjects/:subjectId/units/:unitNumber", notesController.getNotesByUnit);

// Note-specific routes (must come before /:id to avoid conflicts)
router.get("/:id/summary", notesController.getSummary);
router.get("/:id/ask", notesController.askQuestion);
router.post("/:id/ask", notesController.askQuestion);
// Bookmark and mark as completed routes removed
router.get("/:id/progress", notesController.getProgress);
router.post("/:id/bookmark", notesController.toggleBookmark);
router.get("/:id/search", searchController.searchInNote); // Search inside PDF

// Generic get by ID (must come last)
router.get("/:id", notesController.getNoteById);

export default router;
