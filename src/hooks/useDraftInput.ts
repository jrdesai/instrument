import { useCallback, useEffect, useRef } from "react";
import { useToolStore } from "../store";

/**
 * Persists and restores a tool's input across navigation.
 * Call setDraft on every input change (debounced is fine).
 * Pair with {@link useRestoreStringDraft} or {@link useRestoreDraft} on mount
 * so persisted values apply after localStorage hydration.
 *
 * Do NOT use for sensitive tools (jwt, api-key-generator).
 */
export function useDraftInput(toolId: string) {
  const setDraftInput = useToolStore((s) => s.setDraftInput);
  const draft = useToolStore((s) => s.draftInputs[toolId] ?? null);

  const setDraft = useCallback(
    (input: unknown) => setDraftInput(toolId, input),
    [toolId, setDraftInput]
  );

  return { draft, setDraft };
}

/**
 * After the persisted tool store hydrates, set string state from the saved draft once.
 */
export function useRestoreStringDraft(
  toolId: string,
  setValue: (value: string) => void
) {
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;
  const doneRef = useRef(false);

  useEffect(() => {
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
}

/**
 * After hydration, invoke apply once with the raw persisted draft for this tool
 * (use for object-shaped drafts).
 */
export function useRestoreDraft(
  toolId: string,
  apply: (raw: unknown) => void
) {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const doneRef = useRef(false);

  useEffect(() => {
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
