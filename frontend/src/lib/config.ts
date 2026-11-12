/** Shared API configuration. Mirrors the Vite dev proxy (`/api`). */

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
