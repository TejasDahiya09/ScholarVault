import cors from "cors";
import config from "../config.js";

/**
 * CORS Configuration Middleware
 * 
 * CRITICAL: This must be applied BEFORE any routes.
 * Production origins are hardcoded as fallback to prevent CORS failures.
 */

// Hardcoded production origins (fallback if env var missing)
const PRODUCTION_ORIGINS = [
  "https://scholarvault.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Merge env origins with hardcoded production origins
    const envOrigins = config.ALLOWED_ORIGINS || [];
    const allowedOrigins = [...new Set([...PRODUCTION_ORIGINS, ...envOrigins])];

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject unknown origins (don't throw, just return false)
    console.warn(`CORS: Blocked origin ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export default corsMiddleware;
