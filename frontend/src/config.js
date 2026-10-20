/**
 * Dynamic Environment & API Base URL Configuration
 * Detects whether the app is executing in a local development environment or production cloud.
 */

const getApiBaseUrl = () => {
  // 1. Honor explicit Vite environment variable if provided
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }

  // 2. Client-side hostname inspection
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Localhost development environment
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      // Local development server port (FastAPI running on 8008 or 8000)
      return "http://127.0.0.1:8008";
    }
  }

  // 3. Production Cloud Deployment URL (Render / Railway / Vercel)
  // Replace with your live Render backend service URL after initial deployment:
  return "https://uts-railway-backend.onrender.com";
};

export const API_BASE = getApiBaseUrl();
export const IS_LOCAL = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export default {
  API_BASE,
  IS_LOCAL
};
