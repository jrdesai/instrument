/**
 * Desktop (Tauri) implementation of the platform bridge.
 * Uses @tauri-apps/api/core for invoke — no React component should import this directly;
 * use callTool() from the bridge index instead.
 */

import { getToolByRustCommand } from "../registry";

/**
 * Invokes a Tauri command by name with the given input payload.
 * @param toolId - Tauri command name (e.g. from registry rustCommand)
 * @param input - Serializable input object (passed as `{ input }` or `{ req }` to the command)
 */
export async function callToolDesktop(
  toolId: string,
  input: unknown
): Promise<unknown> {
  const { invoke } = await import("@tauri-apps/api/core");
  const tool = getToolByRustCommand(toolId);
  const payloadKey = tool?.desktopPayloadKey ?? "input";
  const payload = { [payloadKey]: input };
  return invoke(toolId, payload);
}
