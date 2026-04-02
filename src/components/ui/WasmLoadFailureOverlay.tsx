import { useWasmLoadFailureStore } from "../../store/wasmLoadFailure";
import { WasmErrorBanner } from "../tool/WasmErrorBanner";

/**
 * Covers the tool panel when WASM failed to load on web, so users see guidance
 * instead of a broken UI or raw console errors.
 */
export function WasmLoadFailureOverlay() {
  const message = useWasmLoadFailureStore((s) => s.message);
  if (!message) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background-light/95 dark:bg-background-dark/95"
      role="alert"
      title={message}
    >
      <WasmErrorBanner />
    </div>
  );
}
