import { Router } from "express";
import subjectsDB from "../db/subjects.js";
import notesDB from "../db/notes.js";
import completionsDB from "../db/completions.js";
import { authenticate } from "../middlewares/auth.js";
import { noCache } from "../middlewares/noCache.js";
import { supabase } from "../lib/services.js";

const router = Router();

/**
 * Get all subjects with optional filters
 * If userOnly=true query param, only returns subjects user has interacted with
 * Otherwise returns all subjects (for browsing)
 */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const userOnly = req.query.userOnly === 'true';
    const filters = {
      branch: req.query.branch,
      semester: req.query.semester,
    };

    // Get all subjects based on filters
    const allSubjects = await subjectsDB.getAll(filters);

    // PHASE 1: User-specific filtering disabled (table dropped)
    // Return all subjects for browsing
    res.json(allSubjects);
  } catch (err) {
    next(err);
  }
});

/**
 * Get subject by ID with resources
 */
router.get("/:id", async (req, res, next) => {
  try {
    const subject = await subjectsDB.getWithResources(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json(subject);
  } catch (err) {
    next(err);
  }
});

/**
 * Get subject notes
 */
router.get("/:id/notes", async (req, res, next) => {
  try {
    const subject = await subjectsDB.getById(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const notes = await notesDB.getAllBySubjectId(req.params.id);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// ...existing code...

/**
 * Get progress for a subject (user-scoped)
 * GET /api/subjects/:id/progress
 * Returns: progress_percent, completed_units, total_units, completed_note_ids
 */
router.get("/:id/progress", authenticate, noCache, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const subjectId = req.params.id;

    // Fetch all notes for this subject
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id")
      .eq("subject_id", subjectId);
    if (notesError) throw new Error(`Failed to fetch notes: ${notesError.message}`);

    const totalNotes = (notes || []).length;

    // Fetch user's completions for this subject — scoped by user_id
    const completedIds = await completionsDB.getCompletedNoteIds(userId, subjectId);
    const completedCount = completedIds.length;

    const progressPercent = totalNotes > 0 ? Math.round((completedCount / totalNotes) * 100) : 0;

    res.json({
      progress_percent: progressPercent,
      completed_units: completedCount,
      total_units: totalNotes,
      completed_note_ids: completedIds,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get units for a subject with completion flags
 * GET /api/subjects/:id/units
 */
router.get("/:id/units", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const subjectId = req.params.id;

    // Fetch all notes for subject
    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("id, unit_number")
      .eq("subject_id", subjectId);
    if (notesError) {
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    // Group notes by unit_number (structure only)
    const unitsMap = new Map();
    for (const n of notes || []) {
      const unitNum = n.unit_number ?? null;
      if (unitNum == null) continue;
      const entry = unitsMap.get(unitNum) || { id: unitNum, name: `Unit ${unitNum}` };
      unitsMap.set(unitNum, entry);
    }

    // Return sorted units by unit number
    const units = Array.from(unitsMap.values()).sort((a, b) => a.id - b.id);
    res.json(units);
  } catch (err) {
    next(err);
  }
});

export default router;
