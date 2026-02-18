import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/processed-calls": "http://localhost:5000",
      "/api/call-bookings": "http://localhost:5000",
      "/api/internal": "http://localhost:5000",
    },
  },
  envDir: "../",
  envPrefix: ["VITE_", "BOLNA_"],
})
