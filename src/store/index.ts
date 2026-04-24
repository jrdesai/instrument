import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ChainTemplate } from "../data/chainTemplates";
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

export interface ChainStep {
  id: string;
  toolId: string;
  /**
   * For tools with structured output (e.g. JWT outputs header/payload/signature),
   * which field to pipe forward to the next step. undefined = pipe the full string output.
   * Used in Phase 2 execution — stored in Phase 1 so the data model doesn't change.
   */
  outputField?: string;
  /** Per-step static config (secondary inputs set once, not piped). Used in Phase 2. */
  config: Record<string, unknown>;
}

export interface Chain {
  id: string;
  name: string;
  steps: ChainStep[];
  createdAt: number;
  updatedAt: number;
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

function migratePersistedChain(raw: unknown): Chain | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : Date.now();
  const updatedAt = typeof o.updatedAt === "number" ? o.updatedAt : createdAt;
  if (!Array.isArray(o.steps)) return null;
  const steps: ChainStep[] = o.steps
    .map((st): ChainStep | null => {
      if (!st || typeof st !== "object") return null;
      const s = st as Record<string, unknown>;
      if (typeof s.id !== "string" || typeof s.toolId !== "string") return null;
      const config =
        s.config && typeof s.config === "object" && !Array.isArray(s.config)
          ? (s.config as Record<string, unknown>)
          : {};
      const outputField = typeof s.outputField === "string" ? s.outputField : undefined;
      return { id: s.id, toolId: s.toolId, outputField, config };
    })
    .filter((x): x is ChainStep => x !== null);
  return { id: o.id, name: o.name, steps, createdAt, updatedAt };
}

interface ChainState {
  chains: Chain[];
  activeChainId: string | null;
  /** Persisted first-step input per chain. Keyed by chainId. */
  chainInputs: Record<string, string>;
  createChain: (name?: string) => Chain;
  createChainFromTemplate: (template: ChainTemplate) => Chain;
  deleteChain: (chainId: string) => void;
  renameChain: (chainId: string, name: string) => void;
  addStep: (chainId: string, toolId: string) => void;
  removeStep: (chainId: string, stepId: string) => void;
  moveStepUp: (chainId: string, stepId: string) => void;
  moveStepDown: (chainId: string, stepId: string) => void;
  setActiveChainId: (chainId: string | null) => void;
  getChain: (chainId: string) => Chain | undefined;
  updateStep: (
    chainId: string,
    stepId: string,
    updates: Partial<Pick<ChainStep, "outputField" | "config">>
  ) => void;
  setChainInput: (chainId: string, value: string) => void;
}

const chainStoreImpl = persist(
  immer<ChainState>((set, get) => ({
    chains: [],
    activeChainId: null,
    chainInputs: {},

    createChain: (name) => {
      const now = Date.now();
      const chain: Chain = {
        id: crypto.randomUUID(),
        name: name?.trim() ? name.trim() : "Untitled chain",
        steps: [],
        createdAt: now,
        updatedAt: now,
      };
      set((state) => {
        state.chains.push(chain);
      });
      return chain;
    },

    createChainFromTemplate: (template) => {
      const now = Date.now();
      const chain: Chain = {
        id: crypto.randomUUID(),
        name: template.name,
        steps: template.steps.map((s) => ({
          id: crypto.randomUUID(),
          toolId: s.toolId,
          outputField: s.outputField,
          config: { ...s.config },
        })),
        createdAt: now,
        updatedAt: now,
      };
      set((state) => {
        state.chains.push(chain);
      });
      return chain;
    },

    deleteChain: (chainId) =>
      set((state) => {
        state.chains = state.chains.filter((c) => c.id !== chainId);
        if (state.activeChainId === chainId) state.activeChainId = null;
        delete state.chainInputs[chainId];
      }),

    renameChain: (chainId, name) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        chain.name = name;
        chain.updatedAt = Date.now();
      }),

    addStep: (chainId, toolId) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        chain.steps.push({
          id: crypto.randomUUID(),
          toolId,
          outputField: undefined,
          config: {},
        });
        chain.updatedAt = Date.now();
      }),

    removeStep: (chainId, stepId) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        chain.steps = chain.steps.filter((s) => s.id !== stepId);
        chain.updatedAt = Date.now();
      }),

    moveStepUp: (chainId, stepId) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        const i = chain.steps.findIndex((s) => s.id === stepId);
        if (i <= 0) return;
        const tmp = chain.steps[i - 1];
        chain.steps[i - 1] = chain.steps[i];
        chain.steps[i] = tmp;
        chain.updatedAt = Date.now();
      }),

    moveStepDown: (chainId, stepId) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        const i = chain.steps.findIndex((s) => s.id === stepId);
        if (i < 0 || i >= chain.steps.length - 1) return;
        const tmp = chain.steps[i + 1];
        chain.steps[i + 1] = chain.steps[i];
        chain.steps[i] = tmp;
        chain.updatedAt = Date.now();
      }),

    setActiveChainId: (chainId) =>
      set((state) => {
        state.activeChainId = chainId;
      }),

    getChain: (chainId) => get().chains.find((c) => c.id === chainId),

    updateStep: (chainId, stepId, updates) =>
      set((state) => {
        const chain = state.chains.find((c) => c.id === chainId);
        if (!chain) return;
        const step = chain.steps.find((s) => s.id === stepId);
        if (!step) return;
        if ("outputField" in updates) step.outputField = updates.outputField;
        if (updates.config) {
          Object.assign(step.config, updates.config);
        }
        chain.updatedAt = Date.now();
      }),

    setChainInput: (chainId, value) =>
      set((state) => {
        state.chainInputs[chainId] = value;
      }),
  })),
  {
    name: "instrument-chains",
    partialize: (state) => ({
      chains: state.chains,
      activeChainId: state.activeChainId,
      chainInputs: state.chainInputs,
    }),
    merge: (persistedState, currentState) => {
      if (!persistedState || typeof persistedState !== "object") {
        return currentState;
      }
      const p = persistedState as Partial<
        Pick<ChainState, "chains" | "activeChainId" | "chainInputs">
      >;
      const chains = Array.isArray(p.chains)
        ? p.chains.map(migratePersistedChain).filter((c): c is Chain => c != null)
        : currentState.chains;
      const activeChainId =
        p.activeChainId === null || typeof p.activeChainId === "string"
          ? p.activeChainId ?? null
          : currentState.activeChainId;
      const chainInputs =
        p.chainInputs && typeof p.chainInputs === "object" && !Array.isArray(p.chainInputs)
          ? (p.chainInputs as Record<string, string>)
          : currentState.chainInputs;
      return { ...currentState, chains, activeChainId, chainInputs };
    },
  }
);

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
