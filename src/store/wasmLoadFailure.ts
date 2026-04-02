import { create } from "zustand";

/** Set when the web WASM bundle fails to load (e.g. missing from deployment). */
interface WasmLoadFailureState {
  message: string | null;
  setWasmLoadFailure: (message: string | null) => void;
}

export const useWasmLoadFailureStore = create<WasmLoadFailureState>((set) => ({
  message: null,
  setWasmLoadFailure: (message) => set({ message }),
}));
