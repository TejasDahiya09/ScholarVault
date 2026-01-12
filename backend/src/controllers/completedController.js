import { supabase } from "../lib/services.js";

export const getCompleted = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subjectId } = req.query;

    const { data, error } = await supabase
      .from("completions")
      .select("note_id")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

export const toggleCompleted = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { noteId, subjectId } = req.body;

    const { data: existing, error: findError } = await supabase
      .from("completions")
      .select("id")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const { error: delError } = await supabase
        .from("completions")
        .delete()
        .eq("id", existing.id);
      if (delError) throw delError;
    } else {
      const { error: insError } = await supabase.from("completions").insert({
        user_id: userId,
        note_id: noteId,
        subject_id: subjectId,
      });
      if (insError) throw insError;
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
