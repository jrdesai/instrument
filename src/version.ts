// Single source of truth for the app version.
// Injected at build time from package.json via vite.config.ts.
export const APP_VERSION: string =
  (import.meta.env.VITE_APP_VERSION as string) ?? "dev";

