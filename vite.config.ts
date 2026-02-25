import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "BOLNA_"],
  envDir: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy ALL /api requests to the Express backend on port 5000
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      // Proxy webhooks too
      "/webhooks": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      allow: [".."],
      strict: false,
    },
  },
});
