import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes to handle Render cold starts
});

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Add JWT token automatically and implement caching
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Check cache for GET requests
  if (config.method === 'get') {
    const cacheKey = config.url + JSON.stringify(config.params || {});
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      config.adapter = () => Promise.resolve(cached.data);
    }
  }

  return config;
});

// Response interceptor for error handling and caching
client.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
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
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Clear cache on mutations
['post', 'put', 'patch', 'delete'].forEach(method => {
  const original = client[method];
  client[method] = function(...args) {
    cache.clear(); // Clear cache on any mutation
    return original.apply(this, args);
  };
});

export default client;

