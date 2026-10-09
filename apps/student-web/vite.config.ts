import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [react(), tailwind()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:8787" },
  },
  build: { sourcemap: false, outDir: "dist", emptyOutDir: true },
});
