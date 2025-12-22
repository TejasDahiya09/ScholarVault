import cors from "cors";
import config from "../config.js";

/**
 * CORS Configuration Middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Parse allowed origins (comma-separated string → array)
const allowedOrigins = config.ALLOWED_ORIGINS
  ? config.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

// If no allowed origins configured, allow all
if (allowedOrigins.length === 0) {
  return callback(null, true);
}

// Check if origin is in allowed list
if (allowedOrigins.includes(origin)) {
  return callback(null, true);
}


    return callback(new Error("CORS not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export default corsMiddleware;
