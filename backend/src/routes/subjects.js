import { Router } from "express";
import subjectsDB from "../db/subjects.js";
import notesDB from "../db/notes.js";
import progressDB from "../db/progress.js";
import { authenticate } from "../middlewares/auth.js";
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

    // Only filter to user subjects if explicitly requested AND user is authenticated
    if (userId && userOnly) {
      // Get all subject IDs where user has any progress/notes
      const { data: userProgress } = await supabase
        .from("user_study_progress")
        .select("subject_id")
        .eq("user_id", userId);

      const userSubjectIds = new Set(
        (userProgress || []).map(p => p.subject_id).filter(Boolean)
      );

      // Only return subjects user has accessed
      const userSubjects = allSubjects.filter(subject => 
        userSubjectIds.has(subject.id)
      );

      return res.json(userSubjects);
    }

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

/**
 * Get subject progress for authenticated user
 */
router.get("/:id/progress", authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const subjectId = req.params.id;

    // Get completion status
    const status = await progressDB.getSubjectCompletionStatus(userId, subjectId);
    const completedNoteIds = await progressDB.getCompletedNotes(userId, subjectId);

    res.json({
      total_units: status.total_notes,
      completed_units: status.completed_notes,
      progress_percent: status.percentage,
      completed_note_ids: completedNoteIds,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
