import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ command, mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // PWA only for production web builds — never register a service worker in Tauri/desktop.
    ...(mode === "web" && command === "build"
      ? [
          VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            manifest: {
              name: "Instrument",
              short_name: "Instrument",
              description: "Privacy-first developer toolkit. All tools run locally.",
              theme_color: "#306ee8",
              background_color: "#1B1D21",
              display: "standalone",
              scope: "/",
              start_url: "/",
              icons: [
                {
                  src: "/pwa-192.png",
                  sizes: "192x192",
                  type: "image/png",
                },
                {
                  src: "/pwa-512.png",
                  sizes: "512x512",
                  type: "image/png",
                },
                {
                  src: "/pwa-512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
            },
            workbox: {
              // Material Symbols woff2 is ~3.5 MiB — above Workbox’s 2 MiB default precache cap.
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
              globIgnores: ["**/wasm-pkg/**"],
              runtimeCaching: [
                {
                  urlPattern: /\/wasm-pkg\/.*/,
                  // CacheFirst kept users on stale instrument_web.js for up to a week after
                  // a deploy — new UI then called WASM exports missing from the old bundle.
                  handler: "NetworkFirst",
                  options: {
                    cacheName: `wasm-instrument-${pkg.version}`,
                    networkTimeoutSeconds: 5,
                    expiration: {
                      maxAgeSeconds: 7 * 24 * 60 * 60,
                    },
                  },
                },
              ],
              navigateFallback: "index.html",
              navigateFallbackDenylist: [/^\/wasm-pkg\//],
              cleanupOutdatedCaches: true,
            },
          }),
        ]
      : []),
  ],

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
