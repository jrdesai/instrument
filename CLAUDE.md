# Instrument — Claude Code Context

## What this is

**Instrument** is a privacy-first developer toolkit — a cross-platform desktop app (Tauri + React + TypeScript) with a web version deployed to Cloudflare Pages. All tool logic runs locally: on desktop via native Rust, on web via WebAssembly compiled from the same Rust code. No data ever leaves the user's device.

Current version: **1.2.0**
Web: https://instrument-wqt.pages.dev
Stack: Tauri 2 · React 18 · TypeScript · Vite · Zustand · Rust (Cargo workspace) · wasm-pack

**Backlog and future improvements:** see `docs/DEVELOPMENT_PLAN.md` §6 — covers deferred
technical improvements (ts-rs, tauri-specta, self-hosted fonts, mobile layout, CI clippy)
with effort estimates and trigger conditions for when each becomes worth doing.

---

## Project structure

```
instrument/
├── src/                        # React frontend
│   ├── bridge/                 # ONLY place that calls Rust — use callTool() everywhere
│   │   ├── index.ts            # callTool(), isDesktop, isWeb
│   │   ├── desktop.ts          # Tauri invoke() — never import directly from components
│   │   └── web.ts              # WASM module loader — never import directly from components
│   ├── registry/index.ts       # Single source of truth for all tools
│   ├── store/index.ts          # Zustand (favourites, history, recents, settings)
│   ├── tools/                  # One folder per tool (e.g. tools/base64/)
│   └── components/             # Shared UI (layout/, ui/)
├── src-core/                   # Rust workspace
│   ├── instrument-core/        # Pure Rust — all tool logic, no Tauri/WASM deps
│   ├── instrument-desktop/     # Tauri command wrappers → delegates to instrument-core
│   ├── instrument-web/         # wasm-bindgen wrappers → delegates to instrument-core
│   └── regex-core/             # Regex engine (multi-engine match + explain), shared by desktop + web
├── src-tauri/                  # Tauri app shell (config, icons, binary)
├── public/wasm-pkg/            # ⚠️ COMMITTED — WASM binary served by Cloudflare
├── docs/
│   ├── ARCHITECTURE.md         # Full architecture reference
│   ├── design/DESIGN_REFERENCE.md
│   └── tools/                  # One doc per tool
└── temp/                       # Cursor prompt files (not committed context)
```

---

## Key commands

```bash
pnpm tauri dev          # Run desktop app (hot reload)
pnpm run dev:web        # Run web version in browser (localhost:1420 via Vite only — NOT tauri dev)
pnpm dev                # Alias for tauri dev — do NOT use this to test web/WASM behaviour
pnpm run build:wasm     # Compile Rust → WASM → public/wasm-pkg/ (must commit after)
pnpm run build:web      # build:wasm + vite build --mode web
pnpm run typecheck      # tsc --noEmit
pnpm run lint           # eslint src/
pnpm run test:rust      # cargo test (all Rust)
pnpm run test:ts        # vitest run
pnpm run check:pure     # Verify instrument-core has no Tauri/fs/tokio imports
cargo test --manifest-path src-core/Cargo.toml -p instrument-core  # Core tests only
```

---

## ⚠️ Critical rules (non-obvious)

### 1. WASM sync — most common mistake
After **any** change to `src-core/` Rust files, you MUST:
```bash
pnpm run build:wasm
git add public/wasm-pkg/
git commit -m "chore: rebuild wasm-pkg ..."
```
- `public/wasm-pkg/` is **committed to git** so Cloudflare Pages can deploy without a Rust toolchain
- `src/wasm-pkg/` is gitignored — ignore it
- The CI `wasm-sync` job will fail if `public/wasm-pkg/` doesn't match the Rust source
- After a version bump in `package.json` / `Cargo.toml`, also rebuild — the version is embedded in the WASM package.json
- **Symptom of missing WASM in dev**: browser console shows `"text/html" is not a valid JavaScript MIME type`. This means `public/wasm-pkg/instrument_web.js` is missing — run `pnpm run build:wasm` to fix. Vite returns `index.html` for any unmatched path, masking the real 404.
- **Vite 7 — never `import()` a `/public` path from source**: Vite 7 forbids loading anything under `public/` through the normal `import()` pipeline from app source (throws "This file is in /public … should not be imported from source code"). The WASM loader in `src/bridge/web.ts` works around this by building an absolute URL with `new URL(path, self.location.origin + '/')` and passing that string to `import()`. The browser fetch bypasses Vite's transform pipeline entirely. Do not revert this to a root-relative path like `/wasm-pkg/instrument_web.js`.

### 2. Bridge — never bypass it
Components call `callTool(rustCommand, input)` from `src/bridge/index.ts` only.
Never import `@tauri-apps/api` or the WASM module directly in any component.

### 3. instrument-core must stay pure
No `std::fs`, no `tauri`, no `tokio`, no `wasm-bindgen` in `src-core/instrument-core/`.
Run `pnpm run check:pure` to verify. This crate must compile to both native and WASM.

### 4. Auto-run tools — dual debounce + skipHistory
Tools that run on every keystroke (e.g. base64, JSON formatter) must:
- Use 150ms debounce for computation
- Use 1500ms debounce for history capture (or `skipHistory: true` if history is not needed)
- Pass `{ skipHistory: true }` to `callTool()` for the fast computation call
- Record history via `addHistoryEntry()` inside a `setTimeout` — **never** by making a second `callTool()` call
- Cancel the history debounce on unmount: `useEffect(() => () => { if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current); }, [])`
- See `src/tools/base64/` for the reference implementation

### 5. Sensitive tools — never log or store content
Tools handling secrets (JWT, API keys, passwords) must have `sensitive: true` in their registry entry.
The bridge automatically skips history for sensitive tools.
**Component rules for sensitive tools:**
- Do NOT use `useDraftInput` or `useRestoreStringDraft` — these persist input to localStorage
- Do NOT call `addHistoryEntry` manually — the bridge skip is the only history guard needed
- Always pass `{ skipHistory: true }` to every `callTool()` call (belt-and-suspenders)
**Logging rule**: never log input or output values anywhere in the Rust command handlers.
Only log: tool name, duration, error message text. See `src-core/instrument-desktop/src/command_log.rs`.

### 6. Registry is the source of truth
Every tool needs an entry in `src/registry/index.ts`. The registry drives:
- Library display, search, routing, platform filtering
- Bridge config (`wasmExport`, `desktopPayloadKey` for non-standard names)
- History recording (via `rustCommand` → tool ID resolution)

### 7. Platform filtering
- Use `platforms: ["desktop", "web"]` for tools available on both
- Use `platforms: ["desktop"]` for tools that need native OS access or lack WASM support
- The Library, Search, and Dashboard automatically filter by platform — no component-level checks needed

### 8. Result-returning desktop commands — unwrap Specta wrapper
Desktop commands declared as `-> Result<T, String>` (currently only `tool_regex_test` and
`tool_regex_explain` in `regex-core`) are wrapped by Specta as `{ status: "ok", data: T }` on
desktop but return `T` directly on web/WASM. Always unwrap with:
```ts
import { unwrapSpectaCommandResult } from "../hooks/unwrapSpectaCommandResult";
const value = unwrapSpectaCommandResult<T>(await callTool(..., { skipHistory: true }));
```
Do NOT skip this for any command that returns `Result` — the raw object will crash if used as `T`.

### 9. sqlformat is optional in WASM
`instrument-core` has a `sql` feature flag. `instrument-web` explicitly enables it (`features = ["sql"]`). If you need to exclude sqlformat from WASM again, set `default-features = false` in `instrument-web/Cargo.toml`.

---

## Adding a new tool (checklist)

1. **Rust core** — add module in `src-core/instrument-core/src/<category>/`
   Export `Input`, `Output` structs (serde + camelCase) and a `process(input) -> Output` fn.
   Add `pub mod <name>;` to the category `mod.rs` and `lib.rs`.

2. **Desktop binding** — add `#[tauri::command]` in `src-core/instrument-desktop/src/commands/<category>.rs`
   Delegate to core. Use `command_log::finish_ok()` / `finish_result()` for timing logs.

3. **WASM binding** — add `#[wasm_bindgen]` export in `src-core/instrument-web/src/lib.rs`
   Mirror the desktop binding exactly.

4. **Register command** — add to `tauri::generate_handler![]` in `src-tauri/src/lib.rs`.

5. **Registry entry** — add to `src/registry/index.ts` with all required fields.

6. **Tool component** — create `src/tools/<tool-id>/<ToolName>Tool.tsx`.
   Use `callTool(tool.rustCommand, input)` from the bridge.

7. **Rebuild WASM** — `pnpm run build:wasm` then commit `public/wasm-pkg/`.

8. **Docs** — add `docs/tools/<tool-name>.md`.

---

## State management (Zustand)

Store is in `src/store/index.ts` split into two persisted stores:
- `useToolStore` — favourites, recents, settings (theme, font size)
- `useHistoryStore` — per-tool history (capped at 100 entries per tool)

Zustand devtools are only active in `import.meta.env.DEV` to avoid bundle bloat.

---

## Logging (desktop only)

- **Stdout**: DEBUG+ for `instrument_desktop`, WARN+ for everything else — visible in terminal during `pnpm tauri dev`
- **Log file**: WARN+ only — only slow calls (>200ms) and errors are persisted
- **Log location** macOS: `~/Library/Logs/com.jigardesai.instrument/instrument.log`
- **Privacy**: input/output values are NEVER logged. Only tool name, duration, error message.
- Web version has no persistent logging — browser DevTools console only.

---

## Deployment

- **Desktop**: `pnpm run build` → produces platform installer via Tauri bundler
- **Web**: Push to `main` → GitHub Actions builds → Cloudflare Pages auto-deploys
- **CI jobs**: typecheck, lint, test:ts, rust tests, web build, wasm-sync check
- **wasm-sync CI**: fails if `public/wasm-pkg/` differs from a fresh `pnpm run build:wasm` — prevents stale WASM being shipped
- **Check CI after push**: use the GitHub MCP tool — do not use `gh` (not installed)

---

## GitHub integration

GitHub MCP is configured for this project via `.mcp.json` (gitignored — contains token, never commit).
`gh` CLI is **not installed** — use GitHub MCP tools for all GitHub API operations.

| Task | Tool |
|---|---|
| Check CI status after push | `mcp__github__list_workflow_runs` |
| Create a pull request | `mcp__github__create_pull_request` |
| Read / create issues | `mcp__github__list_issues` / `mcp__github__add_issue_comment` |
| View open PRs | `mcp__github__list_pull_requests` |
| Check latest release | `mcp__github__get_latest_release` |
| Scan for leaked secrets | `mcp__github__run_secret_scanning` |

**PR creation** — `gh` CLI is not installed. Use `mcp__github__create_pull_request` directly.
Do NOT attempt `gh pr create` — it will fail. Always use the GitHub MCP tool instead.

```
title: conventional commit style, under 70 chars
body:  ## Summary (bullets) · ## Test plan (checklist) · 🤖 Generated with Claude Code
```

---

## Repo conventions

- `pnpm` only — never `npm` or `yarn`
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `perf:`, `refactor:`, `security:`)
- All Rust structs: `#[derive(Debug, Clone, Serialize, Deserialize)]` + `#[serde(rename_all = "camelCase")]`
- Rust errors: use `thiserror` — never `panic!` in library code
- TypeScript: strict mode, named exports (except tool components), JSDoc on all exported functions

---

## Compact instructions

When compacting, prioritize: files edited, new Rust command names, registry entries added, WASM sync status, and any unresolved errors. Discard UI iteration details, intermediate error messages that were resolved, and tool output samples.
