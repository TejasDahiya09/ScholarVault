import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { getHydration } from "../controllers/hydration.js";
import { assertAllInvariants } from "../db/invariants.js";

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

// GET /api/state/invariants - Check invariants (development/CI)
router.get("/invariants", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    await assertAllInvariants(userId);
    res.json({ 
      success: true, 
      message: "All invariants passed" 
    });
  } catch (err) {
    console.error("[INVARIANT] Check failed:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;
