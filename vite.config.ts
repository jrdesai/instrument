import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**", "**/src-core/**", "**/target/**"],
    },
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      // @ts-expect-error process is a nodejs global
      process.env.npm_package_version ?? pkg.version
    ),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Match only react + react-dom packages — not react-router* (those share the "react" prefix).
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router/")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/zustand")) {
            return "vendor-state";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/vitest.setup.ts"],
  },
}));
