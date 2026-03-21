/**
 * Platform bridge abstraction for Instrument.
 *
 * This is the only place the app talks to Rust: on desktop via Tauri commands,
 * on web via the instrument-web WASM module. No React component should ever
 * import `@tauri-apps/api` or the WASM package directly — use callTool() and
 * usePlatform() from this file so the UI stays platform-agnostic and testable.
 */

import { useMemo } from "react";
import { getToolByRustCommand } from "../registry";
import { useHistoryStore } from "../store";

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
 * In development, logs slow calls (>100ms warn, >500ms error) and errors.
 * No input/output are logged (privacy). Production builds produce no bridge logs.
 *
 * @param toolId - Command name (desktop) or WASM export name (web), e.g. from registry rustCommand
 * @param input - Serializable input for the tool
 * @param options.skipHistory - Pass true for auto-run tools to suppress history capture
 * @returns Promise resolving to the tool output
 */
export async function callTool(
  toolId: string,
  input: unknown,
  options?: { skipHistory?: boolean }
): Promise<unknown> {
  const start = performance.now();
  const tool = getToolByRustCommand(toolId);
  const effectiveSkipHistory =
    options?.skipHistory || tool?.sensitive === true;

  try {
    let result: unknown;
    if (isDesktop) {
      const { callToolDesktop } = await import("./desktop");
      result = await callToolDesktop(toolId, input);
    } else {
      const { callToolWeb } = await import("./web");
      result = await callToolWeb(tool?.wasmExport ?? toolId, input);
    }
    const duration = performance.now() - start;
    if (import.meta.env.DEV) {
      if (duration > 500) {
        console.error(
          `[bridge] ${toolId} took ${duration.toFixed(1)}ms — critically slow`
        );
      } else if (duration > 100) {
        console.warn(
          `[bridge] ${toolId} took ${duration.toFixed(1)}ms — consider optimising`
        );
      }
    }
    if (!effectiveSkipHistory) {
      // Resolve the registry tool ID from the Rust command name so the
      // history page can look up the correct display name and icon.
      const registryId = tool?.id ?? toolId;
      useHistoryStore.getState().addHistoryEntry(registryId, {
        input,
        output: result,
        timestamp: Date.now(),
      });
    }
    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      const message =
        err instanceof Error ? err.message : err != null ? String(err) : "Unknown error";
      console.error(`[bridge] ${toolId} failed: ${message}`);
    }
    throw err;
  }
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
