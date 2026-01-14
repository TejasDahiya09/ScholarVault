import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes to handle Render cold starts
});


// In-memory cache (only used for unauthenticated GETs)
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for public endpoints only

// Cache invalidation on mutations (still used for unauthenticated endpoints)
const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Add JWT token automatically and implement caching
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 🚨 USER-SCOPED CACHE INVARIANT:
  // Authenticated GET requests must NEVER be cached or shared across users.
  // Only unauthenticated GETs (e.g., public endpoints) may use cache.
  // If config.noCache === true, always skip cache.
  const noCache = config.noCache === true;
  const urlForCache = config.url || '';
  const isAuthenticated = !!token;
  const isLiveEndpoint = urlForCache.includes('/progress'); // always fetch fresh progress
  if (
    config.method === 'get' &&
    !urlForCache.includes('/auth') &&
    !isLiveEndpoint &&
    !isAuthenticated &&
    !noCache
  ) {
    const cacheKey = urlForCache + JSON.stringify(config.params || {});
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      config.adapter = () => Promise.resolve(cached.data);
    }
  }

  // Invalidate related caches on mutations (still applies for unauthenticated endpoints)
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const url = config.url || '';

    // Bookmark toggles affect bookmark lists
    if (url.includes('/notes/') && url.includes('/bookmark')) {
      invalidateCache('/bookmarks');
    }

    // Completion toggles affect subject progress and dashboard summaries
    if (url.includes('/notes/') && url.includes('/complete')) {
      invalidateCache('/subjects');
      invalidateCache('/progress');
    }

    // Fallback broad invalidations
    if (url.includes('/bookmarks')) invalidateCache('/bookmarks');
    if (url.includes('/progress')) invalidateCache('/progress');
    if (url.includes('/notes')) invalidateCache('/notes');
    if (url.includes('/subjects')) invalidateCache('/subjects');
  }

  return config;
});


// Response interceptor for error handling and caching
client.interceptors.response.use(
  (response) => {
    // 🚨 USER-SCOPED CACHE INVARIANT:
    // Never cache authenticated GET responses or requests with noCache flag.
    const token = localStorage.getItem("sv_token");
    const isAuthenticated = !!token;
    const noCache = response.config.noCache === true;
    if (
      response.config.method === 'get' &&
      response.status === 200 &&
      !response.config.url.includes('/auth') &&
      !isAuthenticated &&
      !noCache
    ) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
      // Clear all cache on auth failure
      cache.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
