import cors from "cors";
import config from "../config.js";

/**
 * CORS Configuration Middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server requests)
    if (!origin) return callback(null, true);

    // Get allowed origins from config (already parsed as array in config.js)
    const allowedOrigins = config.ALLOWED_ORIGINS;

    // If no allowed origins configured, allow all (development mode)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // IMPORTANT: Do NOT throw error; return callback(null, false) instead
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export default corsMiddleware;
