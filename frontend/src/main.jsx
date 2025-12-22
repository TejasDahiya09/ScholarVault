import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Initialize dark mode on app load with smooth transition
const isDarkMode = localStorage.getItem("sv_darkMode") === "true";
if (isDarkMode) {
  document.body.style.filter = 'invert(0.93) hue-rotate(180deg)';
  document.body.style.backgroundColor = '#0a0a0a';
}

// Add transition support for future toggles
document.body.style.transition = 'filter 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
