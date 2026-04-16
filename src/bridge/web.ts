/**
 * Web (WASM) implementation of the platform bridge.
 * No React component should import this directly —
 * use callTool() from bridge/index.ts instead.
 */

import { useWasmLoadFailureStore } from "../store/wasmLoadFailure";

type WasmModule = Record<string, (input: unknown) => Promise<unknown> | unknown>

/** Thrown when the instrument_web module cannot load (e.g. HTML fallback instead of JS). */
export class WasmLoadError extends Error {
  constructor(url: string, cause?: unknown) {
    const causeMsg =
      cause instanceof Error ? cause.message : String(cause ?? "unknown");
    super(
      `Failed to load WASM module from ${url}. ` +
        `This usually means the wasm-pkg files are missing from the deployment. ` +
        `Cause: ${causeMsg}`
    );
    this.name = "WasmLoadError";
  }
}

// Load from public/wasm-pkg/ (copied to dist/wasm-pkg/ by Vite automatically).
// Run `pnpm run build:wasm` to regenerate. BASE_URL supports non-root deployments.
//
// Vite 7 forbids importing `/public` files from source — root-relative paths are resolved
// and rejected during dev. A full http(s) URL is loaded by the browser only, bypassing that.
function wasmModuleScriptHref(): string {
  const path = `${import.meta.env.BASE_URL}wasm-pkg/instrument_web.js`
  const origin =
    typeof self !== "undefined" && typeof self.location !== "undefined"
      ? self.location.origin
      : ""
  return origin !== "" ? new URL(path, `${origin}/`).href : path
}

let wasmCache: WasmModule | null = null
let loadingPromise: Promise<WasmModule> | null = null

async function loadWasmModule(): Promise<WasmModule> {
  if (wasmCache !== null) return wasmCache
  if (loadingPromise !== null) return loadingPromise

  const wasmHref = wasmModuleScriptHref()
  loadingPromise = import(/* @vite-ignore */ wasmHref)
    .then(async (mod) => {
      const init = (mod as { default?: () => Promise<unknown> }).default
      if (typeof init === "function") await init()
      wasmCache = mod as WasmModule
      loadingPromise = null
      useWasmLoadFailureStore.getState().setWasmLoadFailure(null)
      return wasmCache
    })
    .catch((err: unknown) => {
      loadingPromise = null
      const msg = err instanceof Error ? err.message : String(err ?? "")
      const looksLikeMimeOrHtml =
        err instanceof TypeError &&
        (msg.includes("MIME type") ||
          msg.includes("text/html") ||
          msg.includes("Failed to fetch dynamically imported module"))

      if (looksLikeMimeOrHtml) {
        const wrapped = new WasmLoadError(wasmHref, err)
        useWasmLoadFailureStore.getState().setWasmLoadFailure(wrapped.message)
        throw wrapped
      }
      throw err
    })

  return loadingPromise
}

/**
 * Invokes the matching tool function in the WASM module.
 * @param toolId - Export name matching the wasm-bindgen function (e.g. "tool_base64_process")
 * @param input  - Serializable input passed directly to the WASM function
 * @throws If the WASM module fails to load, the export is missing, or it is not a function
 */
export async function callToolWeb(
  toolId: string,
  input: unknown
): Promise<unknown> {
  const mod = await loadWasmModule()
  const fn = mod[toolId]

  if (fn === undefined) {
    throw new Error(
      `WASM export "${toolId}" not found. ` +
      `Check that instrument-web exposes this function via wasm-bindgen.`
    )
  }

  if (typeof fn !== 'function') {
    throw new Error(
      `WASM export "${toolId}" exists but is not a function (got ${typeof fn}).`
    )
  }

  return fn(input)
}
