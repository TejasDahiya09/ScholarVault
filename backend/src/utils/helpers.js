/**
 * Utility Functions for Backend
 */

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate UUID format
 */
export const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize user input to prevent SQL injection
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 255);
};

/**
 * Format error message for consistency
 */
export const formatError = (err) => {
  return {
    error: typeof err === "string" ? err : err?.message || "Unknown error",
    timestamp: new Date().toISOString(),
  };
};

/**
 * Pagination helper
 */
export const getPagination = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

/**
 * Generate pagination metadata
 */
export const paginationMeta = (page, limit, total) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};

/**
 * Logger utility
 */
export const logger = {
  info: (msg, data) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || "");
  },
  error: (msg, err) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || "");
  },
  warn: (msg, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data || "");
  },
};

export default {
  validateEmail,
  validatePassword,
  validateUUID,
  sanitizeInput,
  formatError,
  getPagination,
  paginationMeta,
  logger,
};
