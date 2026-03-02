/**
 * Web (WASM) implementation of the platform bridge.
 * No React component should import this directly —
 * use callTool() from bridge/index.ts instead.
 */

type WasmModule = Record<string, (input: unknown) => Promise<unknown> | unknown>

// Load from build output: run `pnpm run build:wasm` to generate src/wasm-pkg.
const WASM_MODULE_PATH = new URL('../wasm-pkg/instrument_web.js', import.meta.url).href

let wasmCache: WasmModule | null = null
let loadingPromise: Promise<WasmModule> | null = null

async function loadWasmModule(): Promise<WasmModule> {
  if (wasmCache !== null) return wasmCache
  if (loadingPromise !== null) return loadingPromise

  loadingPromise = import(/* @vite-ignore */ WASM_MODULE_PATH)
    .then(mod => {
      wasmCache = mod as WasmModule
      loadingPromise = null
      return wasmCache
    })

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
