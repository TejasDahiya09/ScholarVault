import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { getCompleted, toggleCompleted } from "../controllers/completedController.js";

const router = express.Router();

router.get("/", authenticate, getCompleted);
router.post("/toggle", authenticate, toggleCompleted);

export default router;
