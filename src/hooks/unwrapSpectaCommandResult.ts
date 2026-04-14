/**
 * Generated Tauri bindings wrap `Result<T, string>` commands as
 * `{ status: "ok", data: T } | { status: "error", error: unknown }`.
 * Web/WASM `callTool` returns `T` directly. Use this after `callTool` when the
 * desktop command uses that Result shape.
 */
export function unwrapSpectaCommandResult<T>(result: unknown): T {
  if (
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    (result as { status: string }).status === "ok" &&
    "data" in result
  ) {
    return (result as { status: "ok"; data: T }).data;
  }
  if (
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    (result as { status: string }).status === "error"
  ) {
    const err = (result as { status: "error"; error: unknown }).error;
    throw new Error(typeof err === "string" ? err : String(err));
  }
  return result as T;
}
