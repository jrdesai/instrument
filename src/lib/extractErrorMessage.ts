/** Extracts a human-readable message from an unknown caught error. */
export function extractErrorMessage(e: unknown, fallback = "Operation failed"): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  if (e != null) return String(e);
  return fallback;
}
