import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

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

export default client;
