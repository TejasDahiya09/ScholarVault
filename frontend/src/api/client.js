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

  // Check cache for GET requests only (not auth endpoints)
  if (config.method === 'get' && !config.url.includes('/auth')) {
    const cacheKey = config.url + JSON.stringify(config.params || {});
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      config.adapter = () => Promise.resolve(cached.data);
    }
  }

  // Invalidate related caches on mutations
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    if (config.url.includes('/bookmarks')) invalidateCache('/bookmarks');
    if (config.url.includes('/progress')) invalidateCache('/progress');
    if (config.url.includes('/notes')) invalidateCache('/notes');
    if (config.url.includes('/subjects')) invalidateCache('/subjects');
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
