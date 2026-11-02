// Public API configuration shared by authentication, classroom and portal clients.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api")
  .trim()
  .replace(/\/+$/, "");
