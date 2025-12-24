import { Router } from "express";
import bookmarksDB from "../db/bookmarks.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// List all bookmarks for the authenticated user
router.get("/", authenticate, async (req, res) => {
	try {
		const userId = req.user.userId;
		const bookmarks = await bookmarksDB.getUserBookmarks(userId);
		res.json({ bookmarks });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Add a bookmark
router.post("/:noteId", authenticate, async (req, res) => {
	try {
		const userId = req.user.userId;
		const { noteId } = req.params;
		await bookmarksDB.addBookmark(userId, noteId);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Remove a bookmark
router.delete("/:noteId", authenticate, async (req, res) => {
	try {
		const userId = req.user.userId;
		const { noteId } = req.params;
		await bookmarksDB.removeBookmark(userId, noteId);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

export default router;
