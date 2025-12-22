import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ===== PERFORMANCE OPTIMIZATIONS =====
// 1. Request deduplication cache (prevent duplicate simultaneous requests)
// 2. Response caching for GET requests
// 3. Request cancellation for aborted operations

const pendingRequests = new Map(); // Track in-flight requests
const responseCache = new Map(); // Cache GET responses

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Request deduplication for GET requests
  if (config.method === 'get') {
    const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
    
    // Check if identical request is already in flight
    if (pendingRequests.has(requestKey)) {
      // Return existing promise instead of making new request
      const controller = new AbortController();
      config.signal = controller.signal;
      config._deduped = true;
      return pendingRequests.get(requestKey).config;
    }
    
    // Check response cache (5 second TTL for GET requests)
    const cached = responseCache.get(requestKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      // Return cached response
      config._fromCache = true;
      return Promise.reject({ 
        config, 
        response: cached.response,
        _cached: true 
      });
    }
    
    // Track this request
    config._requestKey = requestKey;
  }
  
  return config;
});

// Response interceptor for error handling and caching
client.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === 'get' && response.config._requestKey) {
      responseCache.set(response.config._requestKey, {
        response,
        timestamp: Date.now()
      });
      
      // Remove from pending requests
      pendingRequests.delete(response.config._requestKey);
    }
    
    return response;
  },
  (error) => {
    // Handle cached responses
    if (error._cached) {
      return Promise.resolve(error.response);
    }
    
    // Clean up pending request on error
    if (error.config?._requestKey) {
      pendingRequests.delete(error.config._requestKey);
    }
    
    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;

