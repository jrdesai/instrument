/**
 * Web (WASM) implementation of the platform bridge.
 * No React component should import this directly —
 * use callTool() from bridge/index.ts instead.
 */

type WasmModule = Record<string, (input: unknown) => Promise<unknown> | unknown>

// Load from public/wasm-pkg/ (copied to dist/wasm-pkg/ by Vite automatically).
// Run `pnpm run build:wasm` to regenerate.
const WASM_MODULE_PATH = '/wasm-pkg/instrument_web.js'

let wasmCache: WasmModule | null = null
let loadingPromise: Promise<WasmModule> | null = null

async function loadWasmModule(): Promise<WasmModule> {
  if (wasmCache !== null) return wasmCache
  if (loadingPromise !== null) return loadingPromise

  loadingPromise = import(/* @vite-ignore */ WASM_MODULE_PATH).then(
    async (mod) => {
      const init = (mod as { default?: () => Promise<unknown> }).default
      if (typeof init === "function") await init()
      wasmCache = mod as WasmModule
      loadingPromise = null
      return wasmCache
    }
  )

  return loadingPromise
}

/**
 * Invokes the matching tool function in the WASM module.
 * @param toolId - Export name matching the wasm-bindgen function (e.g. "base64_process")
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
