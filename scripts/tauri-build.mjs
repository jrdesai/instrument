#!/usr/bin/env node
/**
 * Wraps `tauri build` and normalizes the CI env var to "true" or "false".
 * Tauri CLI expects --ci to be true/false, but many CI systems set CI=1.
 */
import { spawnSync } from "child_process";

const raw = process.env.CI;
const normalized =
  raw === "1" || raw === 1 ? "true" : raw === "0" || raw === 0 ? "false" : raw || "false";
const env = { ...process.env, CI: normalized };

const result = spawnSync("pnpm", ["exec", "tauri", "build"], {
  stdio: "inherit",
  env,
  shell: true,
});
process.exit(result.status ?? 1);
