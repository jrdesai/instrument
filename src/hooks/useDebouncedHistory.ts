import { useCallback, useEffect, useRef } from "react";
import { useHistoryStore } from "../store";

const DEFAULT_HISTORY_DEBOUNCE_MS = 1500;

export interface DebouncedHistoryControls {
  /** Schedules a history entry after `delayMs`, replacing any pending timer. */
  schedule: (input: unknown, output: unknown) => void;
  /** Cancels any pending history write (e.g. when the user clears input). */
  cancel: () => void;
}

/**
 * Captures tool run history on a debounce timer without triggering a second
 * `callTool()` invocation, and automatically cancels pending timers on unmount.
 *
 * @param toolId - Registry tool ID
 * @param delayMs - Debounce window in milliseconds (default: 1500)
 */
export function useDebouncedHistory(
  toolId: string,
  delayMs: number = DEFAULT_HISTORY_DEBOUNCE_MS
): DebouncedHistoryControls {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addHistoryEntry = useHistoryStore((s) => s.addHistoryEntry);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (input: unknown, output: unknown) => {
      cancel();
      timerRef.current = setTimeout(() => {
        addHistoryEntry(toolId, {
          input,
          output,
          timestamp: Date.now(),
        });
        timerRef.current = null;
      }, delayMs);
    },
    [addHistoryEntry, cancel, delayMs, toolId]
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
