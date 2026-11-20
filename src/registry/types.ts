import type React from "react";

/** Category for Library filtering and grouping. */
export type ToolCategory =
  | "encoding"
  | "crypto"
  | "auth"
  | "json"
  | "text"
  | "datetime"
  | "numbers"
  | "code"
  | "network"
  | "data"
  | "media"
  | "design";

/** Role tag for tool discovery (e.g. frontend, backend). */
export type Role =
  | "frontend"
  | "backend"
  | "devops"
  | "security"
  | "data"
  | "general";

/** Platform(s) the tool runs on. */
export type Platform = "desktop" | "web";

/** A configurable field shown on a chain step card (critical secondary inputs only). */
export type ChainConfigField =
  | {
      key: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      default: string;
    }
  | {
      key: string;
      label: string;
      type: "text";
      placeholder?: string;
      default: string;
    };

/** Registry entry for a single tool. */
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  displayCategory: string;
  displayCategoryIcon: string;
  roles: Role[];
  icon: string;
  shortcut?: string;
  platforms: Platform[];
  rustCommand?: string;
  keywords: string[];
  component: React.LazyExoticComponent<React.ComponentType<unknown>>;
  implemented: boolean;
  /**
   * If true, this tool can appear as a step in a Chain.
   * Chainable tools have one clear primary text input (receives piped data)
   * and produce a string or structured output. Tools excluded: binary I/O,
   * random generators, reference tables, tools needing two simultaneous
   * dynamic inputs.
   */
  chainable?: boolean;

  /**
   * The input object field that receives piped data from the previous step.
   * Required on all tools where chainable === true.
   */
  chainPrimaryInput?: string;

  /**
   * Dot-path to extract the primary output string from the tool's response.
   * Default when absent: "result". Supports dot notation for nested access.
   */
  chainPrimaryOutput?: string;

  /**
   * For structured outputs, the user picks which field pipes forward.
   * Selected key is stored in ChainStep.outputField.
   */
  chainOutputFields?: { key: string; label: string }[];

  /**
   * Critical secondary inputs shown on the chain step card (encode/decode, etc.).
   */
  chainConfig?: ChainConfigField[];

  /** If true, input/output are never recorded in history (e.g. JWT, API keys). */
  sensitive?: boolean;

  /**
   * If true, this tool sends data off the device over the network (e.g. DNS
   * Lookup queries the system resolver). Surfaces a "Uses network" badge so the
   * privacy distinction from fully-local tools is visible at the point of use.
   */
  network?: boolean;

  /**
   * Override for the WASM export name when it differs from rustCommand.
   * Example: rustCommand "tool_regex_explain" → wasmExport "regex_explain"
   * If omitted, rustCommand is used as-is for both desktop and web.
   */
  wasmExport?: string;

  /**
   * If true, this tool can be used in the tray popover mini-window (desktop).
   * Only for tools that work in a ~400×520px single-panel layout.
   */
  trayPopover?: boolean;

  /**
   * CLI subcommand name if this tool is available in the `instrument` CLI binary.
   * Example: "base64" → `instrument base64 --help`
   */
  cliCommand?: string;

  /**
   * Optional curated sample input for non-sensitive tools that use `useRestoreStringDraft`.
   * When present, ToolHeader renders a "Sample" button to populate the tool immediately.
   */
  sampleInput?: string;

  /** Preloads the lazy chunk. */
  preload?: () => void;
}
