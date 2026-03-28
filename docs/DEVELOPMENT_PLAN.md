# Instrument — Development Plan

A phased development plan for the cross-platform developer utility application.  
**Tech stack:** Tauri 2, Rust (instrument-core), React 18, TypeScript, Tailwind CSS, Zustand.

---

## 1. Phased breakdown

### Phase 1 — Environment and foundation

**Goal:** Reproducible dev environment, shared types, and a single end-to-end tool to validate the stack.

- **1.1 Environment**
  - Document and automate: Node/pnpm, Rust, Tauri CLI, OS-specific build deps.
  - Ensure `src-core` workspace builds; `src-tauri` runs against existing React app.
  - CI: lint and test for Rust and TypeScript (no Tauri in CI initially if complex).
- **1.2 Shared contracts**
  - Define tool request/response types in TypeScript (e.g. `ToolInput` / `ToolOutput` or per-tool types) and mirror in Rust with serde.
  - Implement `callTool(toolId, input)` in `src/bridge`: desktop invokes Tauri commands; web will invoke WASM (stub for now).
  - Wire one Tauri command from `instrument-desktop` that calls `instrument-core`.
- **1.3 First tool end-to-end**
  - Implement **Base64** encode/decode in `instrument-core` (encoding module), expose via Tauri command, add a minimal React tool screen that calls `callTool` and displays result.
  - Establishes pattern: core logic in Rust, UI in React, bridge as single integration point.

**Exit criteria:** One tool works in the desktop app; tests pass for core and (optionally) UI.

---

### Phase 2 — Core encoding and hashing

**Goal:** Fill out encoding and crypto modules; all tools usable from the Library and tool routes.

- **2.1 Encoding**
  - URL encoder, HTML entities, Hex converter (and any shared helpers in `instrument-core/encoding`).
  - Each tool: Rust API + tests, Tauri command, registry entry, React tool page.
- **2.2 Crypto and IDs**
  - MD5/SHA hashing, UUID generator in `instrument-core` (crypto + optional small module for UUID).
  - Same pipeline: core → command → registry → UI.
- **2.3 Library and navigation**
  - Library screen: list tools by category/role from registry; navigation to each tool.
  - Reuse design tokens and components from `docs/design/DESIGN_REFERENCE.md`.

**Exit criteria:** Encoding and hashing tools available; Library navigates to each; no regressions on Base64.

---

### Phase 3 — JWT and structured data

**Goal:** JWT and JSON/YAML/CSV tools; more complex I/O and validation.

- **3.1 JWT**
  - JWT decode, verify (HMAC and/or RSA), and build in `instrument-core/jwt`.
  - Careful error handling and safe handling of secrets in the UI (no logging of keys).
- **3.2 JSON**
  - JSON formatter, validator, and diff in `instrument-core/json`.
  - Diff can be structured (e.g. line/segment + add/remove/change) for React to render.
- **3.3 YAML and CSV**
  - YAML-to-JSON and CSV-to-JSON in core (new module or under encoding/transform); clear errors for invalid input.
  - UI: file or paste input, formatted JSON output (and optional download).

**Exit criteria:** JWT and JSON/YAML/CSV tools work; errors surfaced clearly in the UI.

---

### Phase 4 — Text, URL, and time

**Goal:** Text and URL utilities; timestamp and timezone handling.

- **4.1 URL and text**
  - URL parser (parse + optional query/codec helpers) in core; text case converter, word counter, string escaper in `instrument-core/text`.
  - UI: inputs and copy-friendly outputs.
- **4.2 Datetime**
  - Timestamp converter (e.g. Unix ms/s, ISO8601) and timezone converter in `instrument-core/datetime`.
  - Use a single, well-audited crate (e.g. `chrono` or `time`) and keep timezone data updates in mind.

**Exit criteria:** All Phase 4 tools available and tested; timezone behaviour documented.

---

### Phase 5 — Numbers and advanced tools

**Goal:** Number base converter, bitwise calculator, then regex, SQL formatter, and code formatter.

- **5.1 Numbers**
  - Number base converter and bitwise calculator in `instrument-core/numbers`.
  - Clear handling of large numbers and overflow; optional big-int if needed.
- **5.2 Regex and SQL**
  - Regex tester: core returns matches/captures (and possibly errors); React renders highlights and groups.
  - SQL formatter: core does formatting only; define rules (e.g. keyword case, indent) and document.
- **5.3 Code formatter**
  - Scope and rules (which languages? use existing formatters vs custom?). If possible, wrap a single formatter per language and expose via core + UI.

**Exit criteria:** All v1.0 tools implemented, documented, and reachable from the app.

---

### Phase 6 — Polish and launch

**Goal:** Reliable builds, good UX, and release readiness.

- **6.1 Quality**
  - Full regression pass; accessibility (keyboard, focus, contrast); performance (large inputs, many tools).
  - Error boundaries and graceful degradation if a tool fails.
- **6.2 Packaging and distribution**
  - Tauri build for target OSes; signing and notarization where required; installers and update channel if applicable.
- **6.3 Documentation and launch**
  - User-facing docs (e.g. in-app or docs site) for each tool; CONTRIBUTING and ARCHITECTURE updated.
  - Release checklist; v1.0 tag and distribution.

**Exit criteria:** Shippable desktop build; docs and process in place for future tools and versions.

---

## 2. Recommended build order for v1.0 tools

Build in this order to reuse patterns and minimise rework:

| # | Tool | Module (instrument-core) | Rationale |
|---|------|---------------------------|-----------|
| 1 | Base64 | encoding | First E2E; encode/decode pattern for all encoding tools. |
| 2 | URL encoder | encoding | Same pattern as Base64; shared “direction” UX. |
| 3 | HTML entities | encoding | Small API; good for testing registry and UI. |
| 4 | Hex converter | encoding | Completes core encoding set. |
| 5 | MD5/SHA hashing | crypto | Establishes crypto module; no key handling. |
| 6 | UUID generator | crypto (or small id module) | Simple output; validates “generate” UX. |
| 7 | JWT decode/verify/build | jwt | Higher complexity; unblocks “security” category. |
| 8 | JSON formatter/validator | json | High use; validator informs diff. |
| 9 | JSON diff | json | Builds on validator; structured output for UI. |
| 10 | YAML-to-JSON | json (or encoding) | Single-direction transform; simple UI. |
| 11 | CSV-to-JSON | json (or encoding) | Parsing and options (headers, delimiter); good test of table-like output. |
| 12 | URL parser | encoding / text | Structured output (host, path, query); can reuse URL encoder where useful. |
| 13 | Text case converter | text | Simple; multiple modes (lower, upper, title, etc.). |
| 14 | Word counter | text | Simple; establishes “stats” style UI. |
| 15 | String escaper | text | Encode/decode escape sequences; similar UX to encoding. |
| 16 | Timestamp converter | datetime | Core of time tools; Unix ↔ human-readable. |
| 17 | Timezone converter | datetime | Depends on timestamp; single time lib. |
| 18 | Number base converter | numbers | Non-crypto numbers; big numbers consideration. |
| 19 | Bitwise calculator | numbers | Builds on number handling; clear input/output types. |
| 20 | Regex tester | text (or dedicated regex module) | Medium–high complexity; match/capture output for UI. |
| 21 | SQL formatter | text (or dedicated sql module) | Rule-based formatting; document behaviour. |
| 22 | Code formatter | TBD (wrap external or minimal rules) | Depends on scope; can be last to lock scope. |

---

## 3. Risk areas to watch

- **Security**
  - **Secrets:** JWT keys, API keys, or tokens must never be logged or sent to analytics; avoid storing in plain text in frontend state where possible.
  - **Input size:** Limit or stream very large payloads to avoid DoS and UI freezes; document limits per tool.
  - **Dependencies:** Prefer minimal, well-maintained crates; audit for crypto and parsing (e.g. JWT, JSON, CSV).
- **Cross-platform**
  - **Tauri:** Keep Tauri and system WebView versions documented; test on all target OSes early.
  - **Rust/WASM:** If/when instrument-web is used, test instrument-core under `wasm-bindgen`; some crates (e.g. heavy regex or time) may need alternatives for WASM.
- **Data and correctness**
  - **Encoding:** Be strict about character sets (UTF-8) and invalid sequences; consistent behaviour across Base64, URL, HTML, hex.
  - **Time:** Timezone data and DST; pick one Rust time library and stick to it.
  - **Numbers:** Overflow and precision for base converter and bitwise; consider big integers for large values.
- **UX and performance**
  - **Large input:** JSON/YAML/CSV and code formatter may receive big files; consider chunking, workers, or background processing so the UI stays responsive.
  - **Errors:** Clear, actionable messages from core (via serde) so the UI can show them without leaking internals.
- **Scope creep**
  - **Code formatter:** Define v1 scope (e.g. one or two languages or “JSON/HTML only”); defer general-purpose multi-language formatting if needed.
  - **Chains:** If “Chains” (multi-step pipelines) is post–v1.0, keep tool APIs chain-friendly but don’t block launch on it.

---

## 4. Estimated complexity per tool

| Tool | Complexity | Notes |
|------|------------|--------|
| Base64 | **Low** | Encode/decode; well-defined spec; small surface area. |
| URL encoder | **Low** | Encode/decode; percent-encoding rules; edge cases for reserved chars. |
| HTML entities | **Low** | Named + numeric entities; encode/decode; finite set. |
| Hex converter | **Low** | Hex ↔ bytes/text; optional grouping; straightforward. |
| MD5/SHA hashing | **Low** | Hashing only; no keys; use established crate. |
| UUID generator | **Low** | v4 (random) and optionally v7; simple output. |
| JWT decode/verify/build | **High** | Algorithms, key types, claims, verification; security-sensitive; good error messages. |
| JSON formatter/validator | **Medium** | Formatting is easy; validator needs clear error locations and messages. |
| JSON diff | **Medium** | Diff algorithm and structured output; UI rendering of patches. |
| YAML-to-JSON | **Medium** | YAML parsing edge cases; error mapping to line/column. |
| CSV-to-JSON | **Medium** | Delimiters, quoting, headers; encoding and large-file behaviour. |
| URL parser | **Low** | Parse into structured fields; well-defined spec. |
| Text case converter | **Low** | Lower/upper/title/camel/snake etc.; locale considerations optional for v1. |
| Word counter | **Low** | Words, chars, lines; simple rules. |
| String escaper | **Low** | Escape/unescape; JSON, CSV, or generic C-style. |
| Timestamp converter | **Medium** | Multiple formats (Unix s/ms, ISO8601); parsing and formatting. |
| Timezone converter | **Medium** | Depends on timestamp; timezone DB and DST; single library. |
| Number base converter | **Medium** | 2–36 or similar; big numbers; validation. |
| Bitwise calculator | **Medium** | AND/OR/XOR/NOT/shift; input formats (hex, decimal); bit width. |
| Regex tester | **High** | Safe engine; capture groups and match ranges; performance on bad regexes. |
| SQL formatter | **Medium** | Keyword/identifier rules; indent; dialect (e.g. SQLite vs Postgres) if needed. |
| Code formatter | **High** | Scope (languages, options); wrap external tool vs custom; performance. |

---

## Summary

- **Phases 1–2** get the stack and encoding/crypto tools in place.
- **Phases 3–4** add JWT, JSON/YAML/CSV, text, URL, and time tools.
- **Phase 5** completes numbers, regex, SQL, and code formatter.
- **Phase 6** focuses on quality, packaging, and launch.

Build tools in the order of the table in §2 to reuse patterns and contain risk. Track the risk areas in §3 in backlog or ADRs, and use the complexity ratings in §4 for scheduling and testing focus.

---

## 5. Current status (as of v1.0.0)

Phases 1–6 are complete. 37 tools implemented (36 from v0.5.0 + Password Generator),
tested, and available on both desktop and web. The web version is deployed to Cloudflare
Pages. All deferred technical improvements (§6.1–6.6) are shipped.

---

## 6. Deferred technical improvements

These are known improvements that are not urgent but should be revisited as the tool
count grows. Each entry describes the problem, the solution, and the trigger condition
(when it becomes worth doing).

---

### 6.1 Auto-generated TypeScript types from Rust (ts-rs) ✅ Done

`ts-rs` (with `serde-compat`) and `specta` added to `instrument-core`. All serde-backed
tool types derive `TS`, `specta::Type`, and `#[ts(export)]`. Running `pnpm run gen:types`
emits 114 type roots into `src/bindings/` (gitignored). `pnpm run typecheck` now runs
the exporter first, so Rust/TypeScript drift is caught at compile time. CI updated to
set up Rust before typecheck so `gen:types` works on clean checkouts.

35 tool components now import types directly from `src/bindings/` — hand-written
mirror interfaces removed. `RegexTesterTool` and `CodeFormatterTool` retain local
types (no Rust-generated bindings for those). `bigint` fields (JWT timestamps,
ISO 8601 durations, Timestamp unix values) handled with `Number()` conversions
and `0n`-safe null guards where needed.

---

### 6.2 Auto-generated Tauri command bindings (tauri-specta) ✅ Done

Every `#[tauri::command]` in `instrument-desktop` also has `#[specta::specta]`.
`src-tauri/src/lib.rs` uses tauri-specta's `Builder` for command registration.
On debug builds (`#[cfg(debug_assertions)]`), bindings are exported to
`src/bindings/tauri.ts` (gitignored) when `pnpm tauri dev` starts.

`src/bridge/desktop.ts` now dispatches through the tauri-specta generated
`commands` object (`src/bindings/tauri.ts`) instead of raw `invoke()`. The file is
only emitted on debug builds so a `// @ts-ignore TS2307` keeps `tsc` green on clean
checkouts. `desktopPayloadKey` in the registry is retained for a future cleanup pass.
WASM bindings (`instrument-web`) remain manual.

---

### 6.3 Self-hosted Material Symbols font ✅ Done

Material Symbols is served from `public/fonts/` as a self-hosted variable font.
`src/App.css` loads it locally — no external network dependency.

---

### 6.4 Vite vendor chunk splitting ✅ Done

`vite.config.ts` uses `manualChunks` to split React, React Router, and Zustand into
separate cached vendor chunks (`vendor-react`, `vendor-router`, `vendor-state`).
Tool code remains lazy-loaded via `React.lazy()`.

---

### 6.5 Mobile layout for web version ✅ Done

`AppShell` switches to `flex-col` below `md` (768px): sidebar hidden, bottom nav bar
appears with the same four nav items. Header shows a logo mark on mobile. `<main>` is
`overflow-y-auto` on mobile so tool routes scroll. Safe-area inset padding added in
`App.css` for iOS home indicator. Per-tool split/stack layouts are a deferred follow-up.

---

### 6.6 CI cargo clippy gate ✅ Done

`.github/workflows/ci.yml` has a `clippy` job running
`cargo clippy --all-targets -- -D warnings`. Existing warnings in `instrument-core`
were fixed as part of this work.
