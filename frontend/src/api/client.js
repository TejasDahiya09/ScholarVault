import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// Add JWT token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;

