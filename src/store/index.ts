import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Role, Tool } from "../registry";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Single history entry: input, output, and timestamp for one tool run. */
export interface HistoryEntry {
  input: unknown;
  output: unknown;
  timestamp: number;
}

/**
 * Per-tool input config for a chain step. Refine with a concrete ToolInputMap
 * (e.g. Record<toolId, ThatToolInput>) when tool input types are defined.
 */
export type ToolInputMap = Record<string, unknown>;

/**
 * One step in a chain: which tool runs, which field from the previous step's
 * output feeds into this step (inputKey), and the tool-specific config.
 */
export interface ChainStep {
  id: string;
  toolId: string;
  /** Which field from previous step output feeds into this step. */
  inputKey: string;
  /** Tool-specific config; typed per-tool via ToolInputMap when available. */
  config: ToolInputMap;
}

/** A named sequence of tool steps. */
export interface Chain {
  id: string;
  name: string;
  steps: ChainStep[];
  createdAt: number;
}

/** Theme preference. */
export type Theme = "dark" | "light" | "system";

// ---------------------------------------------------------------------------
// Tool store
// ---------------------------------------------------------------------------

const MAX_RECENT_TOOLS = 10;
const MAX_HISTORY_PER_TOOL = 100;

interface ToolState {
  activeToolId: string | null;
  recentToolIds: string[];
  favouriteToolIds: string[];
  /** Last-typed input per tool id (persisted). Do not use for sensitive tools. */
  draftInputs: Record<string, unknown>;
  setActiveTool: (tool: Tool | null) => void;
  addToRecent: (tool: Tool) => void;
  toggleFavourite: (tool: Tool) => void;
  clearRecents: () => void;
  clearFavourites: () => void;
  setDraftInput: (toolId: string, input: unknown) => void;
  getDraftInput: (toolId: string) => unknown;
  clearDraftInputs: () => void;
}

/**
 * Store for the currently active tool and recently used tools (max 10).
 * Only IDs are stored so that Tool objects (with React.lazy components) are
 * never frozen by Immer, which would break lazy resolution.
 */
const toolStoreImpl = persist(
  immer<ToolState>((set, get) => ({
    activeToolId: null,
    recentToolIds: [],
    favouriteToolIds: [],
    draftInputs: {},

    setActiveTool: (tool) =>
      set((state) => {
        state.activeToolId = tool?.id ?? null;
      }),

    addToRecent: (tool) =>
      set((state) => {
        const filtered = state.recentToolIds.filter((id) => id !== tool.id);
        state.recentToolIds = [tool.id, ...filtered].slice(0, MAX_RECENT_TOOLS);
      }),

    toggleFavourite: (tool) =>
      set((state) => {
        const idx = state.favouriteToolIds.indexOf(tool.id);
        if (idx >= 0) {
          state.favouriteToolIds.splice(idx, 1);
        } else {
          state.favouriteToolIds.push(tool.id);
        }
      }),

    clearRecents: () =>
      set((state) => {
        state.recentToolIds = [];
      }),

    clearFavourites: () =>
      set((state) => {
        state.favouriteToolIds = [];
      }),

    setDraftInput: (toolId, input) =>
      set((state) => {
        state.draftInputs[toolId] = input;
      }),

    getDraftInput: (toolId) => get().draftInputs[toolId] ?? null,

    clearDraftInputs: () =>
      set((state) => {
        state.draftInputs = {};
      }),
  })),
  { name: "instrument-tools" }
);

export const useToolStore = create<ToolState>()(
  (import.meta.env.DEV
    ? devtools(toolStoreImpl, { name: "ToolStore" })
    : toolStoreImpl) as typeof toolStoreImpl
);

// ---------------------------------------------------------------------------
// History store (session-only; not persisted)
// ---------------------------------------------------------------------------

interface HistoryState {
  history: Record<string, HistoryEntry[]>;
  addHistoryEntry: (toolId: string, entry: HistoryEntry) => void;
  getHistory: (toolId: string) => HistoryEntry[];
  clearHistory: () => void;
}

/**
 * Store for per-tool input/output history. Kept in memory only (not persisted).
 * Use for "recent runs" or replay within a session.
 */
const historyStoreImpl = immer<HistoryState>((set, get) => ({
  history: {},

  addHistoryEntry: (toolId, entry) =>
    set((state) => {
      if (!state.history[toolId]) state.history[toolId] = [];
      state.history[toolId].unshift(entry);
      if (state.history[toolId].length > MAX_HISTORY_PER_TOOL) {
        state.history[toolId] = state.history[toolId].slice(
          0,
          MAX_HISTORY_PER_TOOL
        );
      }
    }),

  getHistory: (toolId) => {
    return get().history[toolId] ?? [];
  },

  clearHistory: () =>
    set((state) => {
      state.history = {};
    }),
}));

export const useHistoryStore = create<HistoryState>()(
  (import.meta.env.DEV
    ? devtools(historyStoreImpl, { name: "HistoryStore" })
    : historyStoreImpl) as typeof historyStoreImpl
);

// ---------------------------------------------------------------------------
// Chain store
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

interface ChainState {
  chains: Chain[];
  activeChain: Chain | null;
  createChain: (name: string) => Chain;
  addStep: (chainId: string, toolId: string) => void;
  removeStep: (chainId: string, stepId: string) => void;
  runChain: (chainId: string) => void;
  setActiveChain: (chain: Chain | null) => void;
}

/**
 * @internal Stub — always returns true until tool I/O types are defined. Do not use in UI logic.
 */
function areStepsCompatible(_stepA: Tool, _stepB: Tool): boolean {
  // TODO: when ToolInputMap / output types exist, check stepA output has a field stepB accepts
  return true;
}

void areStepsCompatible;

/**
 * Store for chains (sequences of tools). Create chains, add/remove steps,
 * and run a chain. activeChain is the one currently being edited or viewed.
 *
 * Intentionally NOT persisted: chain execution (runChain) is not yet implemented,
 * and chain data structures may change significantly before the feature ships.
 * Add persist() here once chains are stable.
 */
const chainStoreImpl = immer<ChainState>((set, get) => ({
  chains: [],
  activeChain: null,

  createChain: (name) => {
    const chain: Chain = {
      id: generateId(),
      name,
      steps: [],
      createdAt: Date.now(),
    };
    set((state) => {
      state.chains.push(chain);
      state.activeChain = chain;
    });
    return chain;
  },

  addStep: (chainId, toolId) =>
    set((state) => {
      const chain = state.chains.find((c: Chain) => c.id === chainId);
      if (!chain) return;
      const step: ChainStep = {
        id: generateId(),
        toolId,
        inputKey: "",
        config: {},
      };
      chain.steps.push(step);
    }),

  removeStep: (chainId, stepId) =>
    set((state) => {
      const chain = state.chains.find((c: Chain) => c.id === chainId);
      if (!chain) return;
      chain.steps = chain.steps.filter((s: ChainStep) => s.id !== stepId);
    }),

  runChain: (chainId) => {
    const chain = get().chains.find((c: Chain) => c.id === chainId);
    if (!chain) return;
    // TODO: iterate steps, call callTool for each, pass previous output into next step
    throw new Error(
      `runChain: chain execution is not yet implemented (chain: "${chain.name}")`
    );
  },

  setActiveChain: (chain) =>
    set((state) => {
      state.activeChain = chain;
    }),
}));

export const useChainStore = create<ChainState>()(
  (import.meta.env.DEV
    ? devtools(chainStoreImpl, { name: "ChainStore" })
    : chainStoreImpl) as typeof chainStoreImpl
);

// ---------------------------------------------------------------------------
// Preference store (persisted)
// ---------------------------------------------------------------------------

type ActiveRole = Role | "general";

interface PreferenceState {
  theme: Theme;
  activeRole: ActiveRole;
  /** Whether the user has dismissed the home screen welcome card. */
  welcomeDismissed: boolean;
  /** Whether the user has completed or dismissed the first-run onboarding. */
  onboardingComplete: boolean;
  /** Roles the user selected during onboarding. */
  selectedRoles: Role[];
  /** Desktop only: show the menu bar / tray icon (persisted). */
  showTrayIcon: boolean;
  /** Desktop only: auto-paste clipboard into popover tool input on open (default true). */
  clipboardAutoPaste: boolean;
  /** Desktop only: global ⌘⇧Space / Ctrl+Shift+Space opens the popover picker (default true). */
  globalHotkeyEnabled: boolean;
  /** Web only: user dismissed the PWA install banner permanently. */
  pwaInstallDismissed: boolean;
  setTheme: (theme: Theme) => void;
  setRole: (role: ActiveRole) => void;
  setWelcomeDismissed: (dismissed: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setSelectedRoles: (roles: Role[]) => void;
  setShowTrayIcon: (show: boolean) => void;
  setClipboardAutoPaste: (enabled: boolean) => void;
  setGlobalHotkeyEnabled: (enabled: boolean) => void;
  setPwaInstallDismissed: (dismissed: boolean) => void;
}

/**
 * Store for user preferences (theme, active role). Persisted to localStorage
 * so they survive reloads. Use for dark/light mode and Library role filter.
 */
const preferenceStoreImpl = persist(
  immer<PreferenceState>((set) => ({
    theme: "dark",
    activeRole: "general",
    welcomeDismissed: false,
    onboardingComplete: false,
    selectedRoles: [],
    showTrayIcon: true,
    clipboardAutoPaste: true,
    globalHotkeyEnabled: true,
    pwaInstallDismissed: false,

    setTheme: (theme) =>
      set((state) => {
        state.theme = theme;
      }),

    setRole: (role) =>
      set((state) => {
        state.activeRole = role;
      }),

    setWelcomeDismissed: (dismissed) =>
      set((state) => {
        state.welcomeDismissed = dismissed;
      }),

    setOnboardingComplete: (complete) =>
      set((state) => {
        state.onboardingComplete = complete;
      }),

    setSelectedRoles: (roles) =>
      set((state) => {
        state.selectedRoles = roles;
      }),

    setShowTrayIcon: (show) =>
      set((state) => {
        state.showTrayIcon = show;
      }),

    setClipboardAutoPaste: (enabled) =>
      set((state) => {
        state.clipboardAutoPaste = enabled;
      }),

    setGlobalHotkeyEnabled: (enabled) =>
      set((state) => {
        state.globalHotkeyEnabled = enabled;
      }),

    setPwaInstallDismissed: (dismissed) =>
      set((state) => {
        state.pwaInstallDismissed = dismissed;
      }),
  })),
  {
    name: "instrument-preferences",
    merge: (persistedState, currentState) => {
      if (!persistedState || typeof persistedState !== "object") {
        return currentState;
      }
      const p = persistedState as Partial<PreferenceState>;
      return {
        ...currentState,
        ...p,
        // Existing installs without this flag should not see onboarding again.
        onboardingComplete:
          typeof p.onboardingComplete === "boolean"
            ? p.onboardingComplete
            : true,
        selectedRoles: Array.isArray(p.selectedRoles)
          ? (p.selectedRoles as Role[])
          : [],
        pwaInstallDismissed: p.pwaInstallDismissed ?? false,
      };
    },
  }
);

export const usePreferenceStore = create<PreferenceState>()(
  (import.meta.env.DEV
    ? devtools(preferenceStoreImpl, { name: "PreferenceStore" })
    : preferenceStoreImpl) as typeof preferenceStoreImpl
);

export { usePopoverBootstrapStore } from "./popoverBootstrap";
