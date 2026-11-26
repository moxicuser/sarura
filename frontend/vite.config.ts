import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development the Django API runs on port 8000. Proxying /api and /media
// keeps the browser on a single origin, so session cookies and CSRF work
// without extra CORS settings.
const backend = "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: backend, changeOrigin: false },
      "/media": { target: backend, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    css: false,
    // A full run now creates more jsdom environments than earlier steps; keep
    // form tests reliable on slower machines without hiding real failures.
    testTimeout: 15000,
  },
});
