import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes to handle Render cold starts
});

// Enhanced in-memory cache with better invalidation
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for better performance

// Cache invalidation on mutations
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

  // Custom cache bypass for Dashboard (or any request with noCache: true)
  const noCache = config.noCache === true;
  const urlForCache = config.url || '';
  const isLiveEndpoint = urlForCache.includes('/progress'); // always fetch fresh progress
  if (
    config.method === 'get' &&
    !urlForCache.includes('/auth') &&
    !isLiveEndpoint &&
    !noCache
  ) {
    const cacheKey = urlForCache + JSON.stringify(config.params || {});
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      config.adapter = () => Promise.resolve(cached.data);
    }
  }

  // Invalidate related caches on mutations
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
    // Cache successful GET responses (exclude auth)
    if (response.config.method === 'get' && response.status === 200 && !response.config.url.includes('/auth')) {
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
