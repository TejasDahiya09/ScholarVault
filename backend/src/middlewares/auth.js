import jwt from "jsonwebtoken";
import config from "../config.js";

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === "NotFoundError") {
    return res.status(404).json({ error: err.message });
  }

  res.status(500).json({
    error: config.NODE_ENV === "development" ? err.message : "Internal server error",
  });
};

export default {
  authenticate,
  errorHandler,
};
