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
  // A committed stub at src/bindings/tauri.ts satisfies the build.
  // tauri-specta overwrites it with the real typed commands on each `pnpm tauri dev`.
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

/** Invokes a non-tool Tauri shell command (tray, popover, hotkey, clipboard). */
export async function invokeDesktopCommand<T = void>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

/** Subscribes to a Tauri window/app event and returns the unlisten callback. */
export async function listenDesktopEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => handler(e.payload));
}

/** Shows and focuses the current Tauri window. */
export async function showCurrentWindow(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  await w.show();
  await w.setFocus();
}

/** Hides the current Tauri window. */
export async function hideCurrentWindow(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().hide();
}

/** Opens an external URL using the Tauri opener plugin. */
export async function openExternalUrlDesktop(url: string): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

