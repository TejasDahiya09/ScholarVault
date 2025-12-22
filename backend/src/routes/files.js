import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import filesController from "../controllers/files.js";

const router = Router();

// GET /api/files/signed-url?key=...&mode=view|download
router.get("/signed-url", authenticate, filesController.getSignedFileUrl);

export default router;
