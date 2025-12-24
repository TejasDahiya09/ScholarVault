import { Router } from "express";
import bookmarksDB from "../db/bookmarks.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();



// Get all bookmarks for the current user
router.get("/", authenticate, async (req, res) => {
	try {
		const userId = req.user.userId;
		const bookmarks = await bookmarksDB.getBookmarks(userId);
		res.json({ bookmarks });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});


// Alias for /details to support frontend
router.get("/details", authenticate, async (req, res) => {
	try {
		const userId = req.user.userId;
		const bookmarks = await bookmarksDB.getBookmarks(userId);
		res.json({ bookmarks });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

export default router;
