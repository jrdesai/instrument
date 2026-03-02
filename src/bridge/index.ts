/**
 * Platform bridge abstraction for Instrument.
 *
 * This is the only place the app talks to Rust: on desktop via Tauri commands,
 * on web via the instrument-web WASM module. No React component should ever
 * import `@tauri-apps/api` or the WASM package directly — use callTool() and
 * usePlatform() from this file so the UI stays platform-agnostic and testable.
 */

import { useMemo } from "react";

/** Current runtime platform. */
export type Platform = "desktop" | "web";

// Tauri v2 uses __TAURI_INTERNALS__ on window (not __TAURI__).
export const isDesktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isWeb =
  typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

/**
 * Invokes a tool by its command/export name with the given input.
 * On desktop: calls the Tauri command via @tauri-apps/api/core (not @tauri-apps/api/tauri).
 * On web: loads the instrument-web WASM module and calls the matching export.
 *
 * @param toolId - Command name (desktop) or WASM export name (web), e.g. from registry rustCommand
 * @param input - Serializable input for the tool
 * @returns Promise resolving to the tool output
 */
export async function callTool(
  toolId: string,
  input: unknown
): Promise<unknown> {
  if (isDesktop) {
    const { callToolDesktop } = await import("./desktop");
    return callToolDesktop(toolId, input);
  }
  const { callToolWeb } = await import("./web");
  return callToolWeb(toolId, input);
}

/**
 * Hook that returns the current platform flags.
 * Use this in components when you need to branch on desktop vs web.
 */
export function usePlatform(): { isDesktop: boolean; isWeb: boolean } {
  return useMemo(
    () => ({
      isDesktop,
      isWeb,
    }),
    []
  );
}
