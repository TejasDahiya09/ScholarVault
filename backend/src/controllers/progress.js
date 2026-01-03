import { progressDB } from "../db/progress.js";

/**
 * Toggle note completion status
 * POST /api/progress/notes/:noteId/complete
 */
export const toggleNoteCompletion = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { noteId } = req.params;
    const { subjectId } = req.body;

    if (!noteId || !subjectId) {
      return res.status(400).json({ error: "Note ID and Subject ID are required" });
    }

    const result = await progressDB.toggleCompletion(userId, noteId, subjectId);

    res.json({
      success: true,
      isCompleted: result.is_completed
    });
  } catch (err) {
    console.error("Completion toggle error:", err);
    res.status(500).json({ error: "Failed to update completion status" });
  }
};
