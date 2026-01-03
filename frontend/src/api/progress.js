import client from "./client";

/**
 * Toggle note completion status
 * @param {string} noteId - The ID of the note
 * @param {string} subjectId - The ID of the subject
 * @returns {Promise} Response with isCompleted status
 */
export const toggleCompletion = async (noteId, subjectId) => {
  return client.post(`/progress/notes/${noteId}/complete`, { subjectId });
};
