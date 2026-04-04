import { create } from "zustand";

/**
 * Ephemeral clipboard bootstrap for tools that must not persist drafts (e.g. JWT token).
 * Not persisted — cleared after consume.
 */
interface PopoverBootstrapState {
  pending: Record<string, string>;
  setPending: (toolId: string, text: string) => void;
  consumePending: (toolId: string) => string | undefined;
}

export const usePopoverBootstrapStore = create<PopoverBootstrapState>((set, get) => ({
  pending: {},

  setPending: (toolId, text) =>
    set((s) => ({ pending: { ...s.pending, [toolId]: text } })),

  consumePending: (toolId) => {
    const text = get().pending[toolId];
    if (text === undefined) return undefined;
    set((s) => {
      const next = { ...s.pending };
      delete next[toolId];
      return { pending: next };
    });
    return text;
  },
}));
