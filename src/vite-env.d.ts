/// <reference types="vite/client" />

interface Window {
  /** Set by Tauri when loading the tray popover webview (`initialization_script`). */
  __INSTRUMENT_POPOVER__?: boolean;
}
