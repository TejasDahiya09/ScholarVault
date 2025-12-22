import { Router } from "express";
import notesController from "../controllers/notes.js";
import searchController from "../controllers/search.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

/**
 * Notes Routes
 */
router.get("/", notesController.getAllNotes);

// Specific routes must come before parameterized routes
router.get("/subjects/:subjectId", authenticate, notesController.getNotesBySubject);
router.get("/subjects/:subjectId/units/:unitNumber", authenticate, notesController.getNotesByUnit);

// Note-specific routes (must come before /:id to avoid conflicts)
router.get("/:id/summary", authenticate, notesController.getSummary);
router.get("/:id/ask", authenticate, notesController.askQuestion);
router.post("/:id/ask", authenticate, notesController.askQuestion);
router.post("/:id/complete", authenticate, notesController.markAsCompleted);
router.get("/:id/progress", authenticate, notesController.getProgress);
router.post("/:id/bookmark", authenticate, notesController.toggleBookmark);
router.get("/:id/search", searchController.searchInNote); // Search inside PDF
router.get("/:id/view", notesController.getFileInline); // No auth - public file view
router.get("/:id/download", notesController.downloadFile); // Download with proper headers

// Generic get by ID (must come last)
router.get("/:id", notesController.getNoteById);

export default router;
