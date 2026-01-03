import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { getHydration } from "../controllers/hydration.js";

const router = express.Router();

/**
 * State Hydration Routes
 * 
 * Copilot:
 * Bulk state fetching endpoint.
 * All routes require authentication.
 */

// GET /api/state/hydration - Fetch all user state
router.get("/hydration", authenticate, getHydration);

export default router;
