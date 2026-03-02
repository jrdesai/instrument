# Architecture

This document describes the architecture of **Instrument**: a cross-platform developer utility application. It covers project layout, data flow, the bridge pattern, the tool registry, testing strategy, and the web deployment path.

---

## 1. Project layout

```
instrument/
├── src/                          # React frontend (Vite)
│   ├── bridge/                   # Platform abstraction — only place that calls Rust
│   │   ├── index.ts              # callTool(), isDesktop, environment detection
│   │   ├── desktop.ts            # Tauri invoke() wrappers (stub)
│   │   └── web.ts                # WASM bindings (stub)
│   ├── components/               # Shared UI (ui/, layout/)
│   ├── constants/
│   │   └── library.ts            # Category/role mappings (source of truth for Library)
│   ├── hooks/
│   ├── registry/
│   │   └── index.ts              # Tool registry — every tool has an entry here
│   ├── store/                    # Zustand state
│   ├── tools/                    # One folder per tool (e.g. base64/)
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── src-core/                     # Rust workspace (shared logic + bindings)
│   ├── Cargo.toml                # Workspace manifest
│   ├── instrument-core/         # Pure Rust library — all tool logic
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── encoding/
│   │   │   ├── crypto/
│   │   │   ├── jwt/
│   │   │   ├── json/
│   │   │   ├── text/
│   │   │   ├── datetime/
│   │   │   └── numbers/
│   │   └── Cargo.toml
│   ├── instrument-desktop/       # Tauri command bindings (library, no binary)
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── commands/         # #[tauri::command] wrappers → instrument-core
│   │   └── Cargo.toml
│   └── instrument-web/           # wasm-bindgen bindings for browser
│       ├── src/lib.rs
│       └── Cargo.toml
├── src-tauri/                    # Tauri app binary, config, icons (desktop shell only)
│   ├── src/
│   │   ├── main.rs               # Runs Tauri; registers instrument_desktop commands
│   │   └── lib.rs                # Tauri setup
│   ├── tauri.conf.json
│   ├── icons/
│   └── Cargo.toml                # Depends on instrument-desktop
├── docs/
│   ├── design/
│   ├── tools/                    # One doc per tool: docs/tools/<tool-name>.md
│   ├── ARCHITECTURE.md           # This file
│   ├── DEVELOPMENT_PLAN.md
│   └── CONTRIBUTING.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

**Responsibilities**

- **`instrument-core`**: Pure Rust. No Tauri, no wasm-bindgen, no `std::fs`, no tokio. All tool logic lives here and compiles to both native (for desktop) and WASM (for web).
- **`instrument-desktop`**: Thin Tauri command layer. Each `#[tauri::command]` receives/sends serialized data and delegates to `instrument-core`. No `main.rs`, no `tauri.conf.json` — the runnable app and config live in `src-tauri/`.
- **`instrument-web`**: Thin wasm-bindgen layer. Exposes the same `instrument-core` functions to the browser. Used when the app runs in the web (no Tauri).
- **`src-tauri/`**: The actual Tauri application: binary, window config, icons, build script. It depends on `instrument-desktop` and registers its commands.
- **`src/`**: React UI. Communicates with Rust only via `src/bridge/index.ts`. No component may call Tauri `invoke()` or WASM directly.

---

## 2. Data flow

### 2.1 Tool invocation (desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  React UI (e.g. Tool screen)                                                 │
│  - User enters input                                                        │
│  - Calls callTool(toolId, input) from src/bridge/index.ts only              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  src/bridge/index.ts                                                        │
│  - Detects: window.__TAURI_INTERNALS__ → desktop                            │
│  - Calls bridge/desktop: invoke(rustCommand, input)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Tauri (src-tauri)                                                           │
│  - IPC: invoke("tool_base64_encode", { input: "..." })                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  instrument-desktop (src-core/instrument-desktop)                            │
│  - #[tauri::command] fn tool_base64_encode(...)                              │
│  - Deserializes input, calls instrument_core::encoding::base64::encode(...) │
│  - Returns serialized result                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  instrument-core                                                            │
│  - Pure function: encoding::base64::encode(input) -> Result<String>         │
│  - No I/O, no OS; same code path for desktop and (future) web                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                    Result flows back: core → desktop → Tauri → bridge → React
```

### 2.2 Tool invocation (web)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  React UI                                                                    │
│  - Same callTool(toolId, input) from src/bridge/index.ts                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  src/bridge/index.ts                                                        │
│  - No __TAURI_INTERNALS__ → web                                              │
│  - Calls bridge/web: callToolViaWasm(toolId, input)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  instrument-web (WASM)                                                       │
│  - wasm-bindgen exports that call instrument_core::*                         │
│  - Same core functions as desktop                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  instrument-core (compiled to WASM)                                         │
│  - Same pure logic as native build                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Summary (ASCII)

```
                    ┌──────────────┐
                    │   React UI   │
                    │  (components)│
                    └──────┬───────┘
                           │ callTool(toolId, input)
                           ▼
                    ┌──────────────┐
                    │ bridge/      │
                    │ index.ts     │──── __TAURI_INTERNALS__? ────┐
                    └──────┬───────┘                              │
                           │                                      │
              ┌────────────┴────────────┐                         │
              ▼                         ▼                         ▼
     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │ bridge/desktop   │     │ bridge/web      │     │ (future)        │
     │ Tauri invoke()   │     │ WASM bindings   │     │                 │
     └────────┬─────────┘     └────────┬────────┘     └─────────────────┘
              │                         │
              ▼                         ▼
     ┌─────────────────┐     ┌─────────────────┐
     │ instrument-     │     │ instrument-     │
     │ desktop         │     │ web (WASM)      │
     │ #[tauri::command]│     │ wasm-bindgen    │
     └────────┬─────────┘     └────────┬────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
                    ┌──────────────┐
                    │ instrument-  │
                    │ core         │
                    │ (pure Rust)  │
                    └──────────────┘
```

---

## 3. Bridge pattern

The React frontend must never call Tauri or WASM directly. All Rust interaction goes through the bridge.

### 3.1 Single entry point

- **File:** `src/bridge/index.ts`
- **Exports:**
  - **`isDesktop`** — `true` when the app runs inside Tauri (desktop). Implemented as:  
    `typeof window !== "undefined" && "__TAURI_INTERNALS__" in window` (Tauri v2).
  - **`callTool(toolId: string, input: unknown): Promise<unknown>`** — Invokes the tool by id. On desktop it uses Tauri `invoke()` with the command name from the registry; on web it will call the WASM module.

### 3.2 Rule

- **No React component (or any other `src/` module) may call `invoke()` or import from `@tauri-apps/api` or from the WASM module directly.**  
- All such calls are made only inside `src/bridge/` (e.g. `desktop.ts` uses `invoke`, `web.ts` uses WASM). Components import only from `src/bridge/index.ts` and call `callTool(toolId, input)`.

### 3.3 Flow

1. Component gets `toolId` from the registry and builds `input` from the form.
2. Component calls `callTool(toolId, input)` from `src/bridge/index.ts`.
3. Bridge checks `isDesktop`:
   - If **desktop**: delegate to `bridge/desktop.ts` → `invoke(rustCommand, input)`.
   - If **web**: delegate to `bridge/web.ts` → call WASM export for that tool.
4. Result (or error) is returned to the component.

This keeps the UI platform-agnostic and testable by mocking `callTool` without a real Tauri or WASM environment.

---

## 4. Tool registry

Every tool in the application is registered in **`src/registry/index.ts`**. The registry is the source of truth for:

- Which tools exist and how they are exposed in the UI (Library, search, routing).
- Which Tauri command (or WASM export) to call for each tool.
- Categories, roles, and platforms for filtering and display.

### 4.1 Registry entry shape

Each tool entry should include at least:

| Field          | Purpose |
|----------------|--------|
| **id**         | Unique string (e.g. `base64`). Used for routing and `callTool(toolId, …)`. |
| **name**       | Display name (e.g. "Base64 Encoder"). |
| **category**   | One of the Library categories (e.g. Encoding, Security). Must align with `src/constants/library.ts` (e.g. `sidebarMapping`, `categorySubtitles`). |
| **roles**      | Array of role tags for filter pills: e.g. `frontend`, `backend`, `devops`, `security`, `data`. Used with `gridRoleMapping` for which tools show under which role. |
| **icon**       | Icon identifier (e.g. Material Symbol name or Lucide key) for the tool card and nav. |
| **platforms**  | Where the tool runs: `desktop`, `web`, or both. Enables hiding or disabling tools that are not available on the current platform. |
| **rustCommand**| Tauri command name (e.g. `tool_base64_encode`) or WASM export name. The bridge uses this to invoke the correct backend. |
| **keywords**   | Optional string array for search (e.g. "base64", "encode", "decode"). |

### 4.2 Usage

- **Library screen:** Load registry; filter by category/role using `src/constants/library.ts`; render tool cards; link to `/tools/:id`.
- **Tool screen:** Resolve `:id` to registry entry; read `rustCommand` and call `callTool(id, input)` (bridge maps `id` to `rustCommand` internally if needed, or the component can pass the command name as agreed in the bridge API).
- **Search:** Index or filter registry by `name`, `keywords`, and optionally `category`/`roles`.

### 4.3 Adding a new tool

1. Implement logic in **instrument-core** (appropriate module: encoding, crypto, jwt, json, text, datetime, numbers).
2. Add a **Tauri command** in **instrument-desktop** that calls that core function (and, when applicable, a WASM export in **instrument-web**).
3. Add a **registry entry** in `src/registry/index.ts` with `id`, `name`, `category`, `roles`, `icon`, `platforms`, `rustCommand`, `keywords`.
4. Add a **tool component** under `src/tools/<tool-id>/` and wire it to the route and to `callTool`.
5. Add **docs/tools/<tool-name>.md** (per project rules).

---

## 5. Testing strategy

### 5.1 Rust (instrument-core)

- **Location:** Unit tests live alongside the code they test (e.g. in the same module or in `#[cfg(test)]` modules).
- **Scope:** Every public (and important private) function in instrument-core should have at least one unit test. Tests cover encode/decode round-trips, error cases, and edge inputs.
- **Rules:** No `unwrap()` in tests; use `.expect("...")` with a clear message. Descriptive names, e.g. `encodes_standard_ascii_string()`.
- **Run:** `cargo test` from `src-core/` or from the workspace root.

### 5.2 Rust (instrument-desktop / instrument-web)

- Command and WASM bindings are thin. Focus on integration tests or E2E if needed; unit tests can be minimal (e.g. that the command returns the same result as calling core directly).

### 5.3 React / TypeScript

- **Framework:** Vitest with React Testing Library and user-event.
- **Bridge:** All code that uses the bridge must **mock** `src/bridge/index.ts` with `vi.mock()`. No test should require a running Tauri app or a real WASM module.
- **Async:** Mock `callTool` to return a Promise. Use `vi.useFakeTimers()` and do not resolve immediately; advance with `vi.advanceTimersByTime()` so loading and success/error states can be asserted.
- **Interaction:** Prefer `userEvent` for clicks, typing, and navigation. Assert on what the user sees (text, roles, visibility), not on implementation details.
- **Run:** `pnpm test` (or the project’s Vitest script) from the repo root.

### 5.4 Summary

| Layer            | What we test                         | How |
|------------------|--------------------------------------|-----|
| instrument-core  | Pure functions, edge cases, errors   | `cargo test`, unit tests next to code |
| instrument-desktop / web | Bindings call core correctly   | Unit or integration tests |
| React             | UI behaviour, loading/success/error  | Vitest + RTL, mocked bridge, fake timers |

---

## 6. Web deployment path

Instrument is designed to run in two environments:

1. **Desktop:** Tauri 2 app; React frontend loads in the Tauri WebView; Rust runs as native code via **instrument-desktop** commands.
2. **Web:** React frontend served as a static (or SPA) site; Rust runs in the browser as WASM via **instrument-web** (wasm-bindgen) calling the same **instrument-core** code.

### 6.1 Building for web

- **Frontend:** Standard Vite build: `pnpm build` produces the static assets (e.g. `dist/`). These can be deployed to any static host (e.g. GitHub Pages, Netlify, Vercel).
- **Rust → WASM:** Build **instrument-web** for the `wasm32-unknown-unknown` target. Ensure **instrument-core** and its dependencies are WASM-compatible (no `std::fs`, no tokio, etc.). Use `wasm-pack` or Cargo to produce a WASM module and JS glue.
- **Integration:** The built React app loads the WASM module (e.g. via dynamic `import()`). The bridge’s `web.ts` uses this module to implement `callTool` when `!isDesktop`.

### 6.2 Constraints

- **instrument-core** must remain free of Tauri, wasm-bindgen, and OS/async I/O so it can compile to both native and WASM. Any crate that doesn’t support WASM (e.g. some regex or time crates) must be abstracted or feature-gated so the web build only uses WASM-safe code.
- **Tool availability:** The registry’s `platforms` field allows marking some tools as desktop-only (e.g. if they depend on native APIs) so the web UI can hide or disable them.

### 6.3 Deployment checklist (web)

- Build React: `pnpm build`.
- Build WASM: e.g. `wasm-pack build` for instrument-web (or equivalent).
- Configure the host to serve the SPA (e.g. fallback to `index.html` for client-side routing).
- Ensure the WASM file and JS glue are loaded from the same origin or with correct CORS/headers so the app can instantiate the module.

---

This document should be updated when the bridge API, registry shape, or deployment process changes. See also `docs/DEVELOPMENT_PLAN.md` and `docs/design/DESIGN_REFERENCE.md`.
