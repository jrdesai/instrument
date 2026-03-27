/**
 * Desktop (Tauri) implementation of the platform bridge.
 * Dispatches through tauri-specta-generated `commands` — no React component should import
 * this file directly; use callTool() from the bridge index instead.
 */

/**
 * Snake_case Tauri command name → camelCase key on `commands` (tauri-specta convention).
 */
function rustCommandToCommandsKey(rustCommand: string): string {
  return rustCommand.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Invokes a Tauri command by Rust name with the given input (Specta-shaped struct).
 * @param toolId - Tauri command name (e.g. registry `rustCommand`)
 * @param input - Serializable input object for the command
 */
export async function callToolDesktop(
  toolId: string,
  input: unknown
): Promise<unknown> {
  // Module is emitted by tauri-specta when running the desktop shell (`pnpm tauri dev`); see temp/polish-bridge-wiring.md.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- optional file: present only after a debug desktop run
  // @ts-ignore TS2307
  const { commands } = (await import("../bindings/tauri")) as {
    commands: Record<string, (input: unknown) => Promise<unknown>>;
  };

  const fnName = rustCommandToCommandsKey(toolId);
  const fn = commands[fnName];
  if (!fn) {
    throw new Error(
      `[bridge] no generated command for "${toolId}" (looked up as "${fnName}")`
    );
  }

  return fn(input);
}
