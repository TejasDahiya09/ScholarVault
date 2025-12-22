import { create } from "zustand";

const useAuth = create((set) => ({
  token: localStorage.getItem("sv_token") || null,
  user: JSON.parse(localStorage.getItem("sv_user") || "null"),

  login: (token, user) => {
    localStorage.setItem("sv_token", token);
    localStorage.setItem("sv_user", JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("sv_token");
    localStorage.removeItem("sv_user");
    set({ token: null, user: null });
  },
}));

export default useAuth;
