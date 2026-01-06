import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import bookmarksDB from "../db/bookmarks.js";

const router = Router();

// GET /api/bookmarks - return array of bookmarked note IDs
router.get("/", authenticate, async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const ids = await bookmarksDB.getUserBookmarkIds(userId);
		res.json({ bookmarks: ids });
	} catch (err) { next(err); }
});

// GET /api/bookmarks/details - return bookmarks with note details
router.get("/details", authenticate, async (req, res, next) => {
	try {
		const userId = req.user.userId;
		const items = await bookmarksDB.getUserBookmarksWithNotes(userId);
		res.json({ bookmarks: items });
	} catch (err) { next(err); }
});

export default router;
