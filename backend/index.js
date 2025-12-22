import express from "express";
import morgan from "morgan";
import config from "./src/config.js";
import corsMiddleware from "./src/middlewares/cors.js";
import { errorHandler } from "./src/middlewares/auth.js";
import { createAuthLimiter } from "./src/middlewares/rateLimiter.js";

// Route imports
import authRoutes from "./src/routes/auth.js";
import notesRoutes from "./src/routes/notes.js";
import subjectsRoutes from "./src/routes/subjects.js";
import searchRoutes from "./src/routes/search.js";

const app = express();

// Trust Render's proxy for correct client IPs and rate limiting
app.set("trust proxy", 1);

// Create rate limiter AFTER trust proxy is set
const authLimiter = createAuthLimiter();

/**
 * Middleware Setup
 */
// CORS MUST come first, before body parsers
app.use(corsMiddleware);
app.options("*", corsMiddleware);

// Request logging with morgan
// Use 'combined' format in production, 'dev' in development
const morganFormat = config.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  skip: (req) => req.path === '/healthz' // Skip health check logs
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check Endpoint
 * No auth required, excluded from rate limiting
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
 * Auth routes have rate limiting
 */
app.use("/api/auth", authLimiter, authRoutes);
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
