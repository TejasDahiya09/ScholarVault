import { Router } from "express";
import authController from "../controllers/auth.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

/**
 * Public Auth Routes
 */
router.post("/register", authController.register);
router.post("/login", authController.login);

/**
 * Protected Auth Routes
 */
router.get("/me", authenticate, authController.getCurrentUser);
router.put("/profile", authenticate, authController.updateProfile);
router.put("/year", authenticate, authController.updateYear);
router.put("/preferences", authenticate, authController.updatePreferences);
router.put("/password", authenticate, authController.changePassword);
router.put("/email", authenticate, authController.changeEmail);
router.delete("/account", authenticate, authController.deleteAccount);
router.get("/export", authenticate, authController.exportData);

export default router;
