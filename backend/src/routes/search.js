import { Router } from "express";
import searchController from "../controllers/search.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Require authentication for all search endpoints to protect user data and costs
router.use(authenticate);

/**
 * Search Routes
 * 
 * Main hybrid search: GET /api/search?q=...
 * Autocomplete: GET /api/search/suggest?q=...
 * Analytics: GET /api/search/analytics
 * Batch analytics: POST /api/search/analytics/batch
 */

// Specific routes first
router.get("/suggest", searchController.suggest);
router.get("/analytics", searchController.analytics);
router.post("/analytics/batch", searchController.batchAnalytics);

// Main search endpoint
router.get("/", searchController.search);

export default router;
