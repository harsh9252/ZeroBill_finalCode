// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./assets/css/GlobalScrollbar.css";
import "./assets/css/index.css";
import "./assets/css/translate-fix.css";
import "sweetalert2/dist/sweetalert2.min.css";

// Suppress browser extension errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('Extension context invalidated') ||
    event.message?.includes('Chrome extension') ||
    event.filename?.includes('extension://')) {
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Could not establish connection')) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
    <HashRouter>
      <App />
    </HashRouter>
  </GoogleOAuthProvider>
);

