import { create } from "zustand";

interface LastRunState {
  toolId: string | null;
  durationMs: number | null;
  update: (toolId: string, durationMs: number) => void;
}

export const useLastRunStore = create<LastRunState>((set) => ({
  toolId: null,
  durationMs: null,
  update: (toolId, durationMs) => set({ toolId, durationMs }),
}));
