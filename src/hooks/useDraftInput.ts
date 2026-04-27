import { useCallback, useEffect, useRef } from "react";
import { tools } from "../registry";
import { useToolStore } from "../store";

/** Returns true if the given toolId has sensitive: true in the registry. */
function isToolSensitive(toolId: string): boolean {
  return tools.find((t) => t.id === toolId)?.sensitive === true;
}

/**
 * Persists and restores a tool's input across navigation.
 * Call setDraft on every input change (debounced is fine).
 * Pair with {@link useRestoreStringDraft} or {@link useRestoreDraft} on mount
 * so persisted values apply after localStorage hydration.
 *
 * Safe to call for sensitive tools (those with `sensitive: true` in the registry) —
 * the hook automatically no-ops and never writes to localStorage in that case.
 */
export function useDraftInput(toolId: string) {
  const sensitive = isToolSensitive(toolId);
  const setDraftInput = useToolStore((s) => s.setDraftInput);
  const draft = useToolStore((s) => s.draftInputs[toolId] ?? null);

  const setDraft = useCallback(
    (input: unknown) => {
      if (sensitive) return;
      setDraftInput(toolId, input);
    },
    [toolId, sensitive, setDraftInput]
  );

  return { draft: sensitive ? null : draft, setDraft };
}

/**
 * After the persisted tool store hydrates, set string state from the saved draft once.
 * No-ops for sensitive tools (same guard as {@link useDraftInput}).
 */
export function useRestoreStringDraft(
  toolId: string,
  setValue: (value: string) => void
) {
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;
  const doneRef = useRef(false);
  const pendingRestore = useToolStore((s) => s.pendingRestoreInput?.[toolId]);
  const clearPendingRestoreInput = useToolStore(
    (s) => s.clearPendingRestoreInput ?? (() => {})
  );

  useEffect(() => {
    if (isToolSensitive(toolId)) return;
    const run = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      const raw = useToolStore.getState().draftInputs[toolId];
      if (typeof raw === "string") {
        setValueRef.current(raw);
      }
    };

    if (useToolStore.persist.hasHydrated()) {
      run();
      return;
    }
    return useToolStore.persist.onFinishHydration(run);
  }, [toolId]);

  useEffect(() => {
    if (isToolSensitive(toolId)) return;
    if (pendingRestore === undefined) return;
    setValueRef.current(pendingRestore);
    clearPendingRestoreInput(toolId);
  }, [pendingRestore, toolId, clearPendingRestoreInput]);
}

/**
 * After hydration, invoke apply once with the raw persisted draft for this tool
 * (use for object-shaped drafts). No-ops for sensitive tools.
 */
export function useRestoreDraft(
  toolId: string,
  apply: (raw: unknown) => void
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const doneRef = useRef(false);

  useEffect(() => {
    if (isToolSensitive(toolId)) return;
    const run = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      applyRef.current(useToolStore.getState().draftInputs[toolId]);
    };

    if (useToolStore.persist.hasHydrated()) {
      run();
      return;
    }
    return useToolStore.persist.onFinishHydration(run);
  }, [toolId]);
}
