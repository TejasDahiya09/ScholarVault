import searchService from "../services/search.js";

/**
 * Search Controller
 * Handles all search-related endpoints
 */

/**
 * Main Hybrid Search Endpoint
 * GET /api/search?q=query&subjectId=xxx&page=1&per_page=10
 */
export const search = async (req, res, next) => {
  try {
    const { q, subjectId, noteId, page = 1, per_page = 10 } = req.query;
    const userId = req.user?.userId || null; // Optional auth

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await searchService.hybridSearch(q, {
      subjectId,
      noteId,
      page: parseInt(page, 10),
      perPage: parseInt(per_page, 10),
      userId,
    });

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    next(err);
  }
};

/**
 * Autocomplete / Suggest Endpoint
 * GET /api/search/suggest?q=query&limit=10
 */
export const suggest = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await searchService.suggest(q, {
      limit: parseInt(limit, 10),
    });

    res.json(suggestions);
  } catch (err) {
    console.error("Suggest error:", err);
    next(err);
  }
};

/**
 * Search Analytics Endpoint
 * GET /api/search/analytics?limit=20&days=30
 */
export const analytics = async (req, res, next) => {
  try {
    const { limit = 20, days = 30 } = req.query;

    const topQueries = await searchService.getAnalytics({
      limit: parseInt(limit, 10),
      days: parseInt(days, 10),
    });

    res.json(topQueries);
  } catch (err) {
    console.error("Analytics error:", err);
    next(err);
  }
};

/**
 * Search Inside Single Note/PDF
 * GET /api/notes/:noteId/search?q=query&page=1
 */
export const searchInNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { q, page = 1, per_page = 10 } = req.query;
    const userId = req.user?.userId || null;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const results = await searchService.searchInNote(noteId, q, {
      page: parseInt(page, 10),
      perPage: parseInt(per_page, 10),
      userId,
    });

    res.json(results);
  } catch (err) {
    console.error("Note search error:", err);
    next(err);
  }
};

export default {
  search,
  suggest,
  analytics,
  searchInNote,
};
