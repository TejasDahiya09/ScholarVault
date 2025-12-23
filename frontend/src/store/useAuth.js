import { create } from "zustand";

const useAuth = create((set) => ({
  token: localStorage.getItem("sv_token") || null,
  user: JSON.parse(localStorage.getItem("sv_user") || "null"),

  login: async (token, user) => {
    localStorage.setItem("sv_token", token);
    localStorage.setItem("sv_user", JSON.stringify(user));
    set({ token, user });

    // Start study session on login
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      await fetch(`${API_BASE}/api/progress/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ startedAt: new Date().toISOString() }),
      });
    } catch {}
  },

  logout: async () => {
    const token = localStorage.getItem("sv_token");
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      await fetch(`${API_BASE}/api/progress/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });
    } catch {}

    localStorage.removeItem("sv_token");
    localStorage.removeItem("sv_user");
    
    // Clear all session storage (summaries, temp data)
    sessionStorage.clear();
    
    set({ token: null, user: null });
  },
}));

export default useAuth;
