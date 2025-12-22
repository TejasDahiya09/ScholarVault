import express from "express";
import config from "./src/config.js";
import corsMiddleware from "./src/middlewares/cors.js";
import { errorHandler } from "./src/middlewares/auth.js";

// Route imports
import authRoutes from "./src/routes/auth.js";
import notesRoutes from "./src/routes/notes.js";
import subjectsRoutes from "./src/routes/subjects.js";
import searchRoutes from "./src/routes/search.js";

const app = express();

/**
 * Middleware Setup
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

/**
 * Health Check Endpoint
 */
app.get("/healthz", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

/**
 * API Routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/search", searchRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

/**
 * Error Handler Middleware
 */
app.use(errorHandler);

/**
 * Start Server
 */
const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         🎓 ScholarVault Backend API Server                ║
╚═══════════════════════════════════════════════════════════╝

✨ Server running on: http://localhost:${PORT}
📍 Environment: ${config.NODE_ENV}
🔐 JWT Secret configured: ${!!config.JWT_SECRET}
📦 Database configured: ${!!config.SUPABASE_URL}
🤖 Vertex AI configured: ${!!config.VERTEX_PROJECT}

Available Endpoints:
  POST   /api/auth/register        - Register new user
  POST   /api/auth/login           - Login user
  GET    /api/auth/me              - Get current user
  
  GET    /api/notes                - Get all notes
  GET    /api/notes/:id            - Get note by ID
  GET    /api/notes/:id/summary    - Get note summary
  POST   /api/notes/:id/ask        - Ask question about note
  POST   /api/notes/:id/complete   - Mark note as completed
  
  GET    /api/subjects             - Get all subjects
  GET    /api/subjects/:id         - Get subject by ID
  GET    /api/subjects/:id/notes   - Get subject notes
  
  GET    /api/search?q=...         - Hybrid search (keyword + semantic)
  GET    /api/search/suggest?q=... - Autocomplete suggestions
  GET    /api/search/analytics     - Top search queries
  GET    /api/notes/:id/search?q=...- Search inside a PDF

Health Check: GET /healthz
  `);
});

export default app;
