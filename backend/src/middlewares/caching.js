/**
 * Cache-Control Middleware
 * Sets appropriate cache headers based on response type for optimal performance
 */
export const cacheMiddleware = (req, res, next) => {
  // Override res.json to set cache headers before sending
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // Default: short-lived API response caching (5 minutes)
    if (!res.get('Cache-Control')) {
      res.set('Cache-Control', 'public, max-age=300');
    }
    return originalJson(data);
  };

  // Override res.sendFile to set cache headers for static files
  const originalSendFile = res.sendFile.bind(res);
  res.sendFile = function(filepath, options, callback) {
    const ext = filepath.split('.').pop().toLowerCase();
    
    // PDFs and images: aggressive immutable caching (1 year)
    if (['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    return originalSendFile(filepath, options, callback);
  };

  next();
};

/**
 * Specific cache control setters for different response types
 */
export const cacheApi = (req, res, next) => {
  // API responses: 5 minute cache
  res.set('Cache-Control', 'public, max-age=300');
  next();
};

export const cacheFile = (req, res, next) => {
  // File responses: 1 year immutable cache (after content validation)
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  next();
};

export const noCache = (req, res, next) => {
  // Auth and dynamic content: no cache
  res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

export default { cacheMiddleware, cacheApi, cacheFile, noCache };
