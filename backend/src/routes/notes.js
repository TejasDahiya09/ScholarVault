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
// ...existing code...

// Note-specific routes (must come before /:id to avoid conflicts)
// ...existing code...
router.get("/:id/ask", notesController.askQuestion);
router.post("/:id/ask", notesController.askQuestion);
router.get("/:id/search", searchController.searchInNote); // Search inside PDF

// Generic get by ID (must come last)
router.get("/:id", notesController.getNoteById);

export default router;
