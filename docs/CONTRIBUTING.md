# Contributing to Instrument

Thank you for contributing to Instrument. This guide covers environment setup, how to add a new tool, code style, branch/commit conventions, and the PR checklist.

---

## 1. Development environment setup

### Rust (via rustup)

- Install [rustup](https://rustup.rs/) and ensure the stable toolchain is active.
- From the repo root, run:
  ```bash
  cd src-core && cargo build
  ```
  to confirm the Rust workspace builds.

### Node 22 LTS

- Use **Node.js 22 LTS** (or the version in `.nvmrc` or project docs if specified).
- Check with: `node -v` (e.g. `v22.x.x`).

### pnpm

- Install [pnpm](https://pnpm.io/installation).
- **Use pnpm for all package operations** — do not use npm or yarn.
  ```bash
  pnpm install
  pnpm add <pkg>          # dependency
  pnpm add -D <pkg>        # dev dependency
  pnpm dlx <cli>           # one-off CLIs
  ```

### Tauri CLI

- Install the Tauri CLI (optional global, or use via pnpm):
  ```bash
  pnpm add -D @tauri-apps/cli
  ```
- For desktop development:
  ```bash
  pnpm tauri dev
  ```
  (Ensure Rust and system dependencies for Tauri are installed; see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).)

### Quick check

- `pnpm install` — frontend deps
- `pnpm build` — frontend builds
- `cd src-core && cargo test` — Rust tests pass
- `pnpm tauri dev` — desktop app runs (if you have Tauri set up)

---

## 2. Adding a new tool

Follow these steps so the tool works on both desktop (Tauri) and web (WASM) and is documented.

### a. Add a Rust function to the correct `instrument-core` module

- Implement the logic in **instrument-core** under the right module: `encoding`, `crypto`, `jwt`, `json`, `text`, `datetime`, or `numbers`.
- Keep functions **pure**: no I/O, no OS calls, no Tauri or wasm-bindgen.
- Use `Result<T, E>` for fallible operations and `thiserror` for error types. Add doc comments (`///`) with an example.

### b. Add a unit test for the Rust function

- Add tests in the same module (or a `#[cfg(test)]` module).
- Use descriptive names, e.g. `encodes_standard_ascii_string()`.
- Use `.expect("...")` instead of `.unwrap()`.

### c. Add a Tauri command wrapper in `instrument-desktop`

- In `src-core/instrument-desktop/src/commands/`, add a thin wrapper that:
  - Is annotated with `#[tauri::command]`
  - Deserializes the input (named struct with serde)
  - Calls the `instrument-core` function
  - Returns a serializable result (named struct, `serde rename_all = "camelCase"`).
- Register the command in the Tauri app in **src-tauri** (so the frontend can invoke it).

### d. Add a wasm-bindgen wrapper in `instrument-web`

- In `src-core/instrument-web`, expose the same logic via wasm-bindgen so the web build can call it.
- Keep the same input/output shape as the Tauri command for consistency.

### e. Create the React component in `src/tools/<tool-name>/`

- Add the tool UI under `src/tools/<tool-name>/` (e.g. `src/tools/base64/`).
- Use the **bridge only**: call `callTool(toolId, input)` from `src/bridge/index.ts`. Do not call `invoke()` or WASM directly.
- Tool components may use default export for the page component; use named exports for utilities.
- Lazy-load the tool with `React.lazy()` (per project architecture).

### f. Add the entry to `src/registry/index.ts`

- Add a registry entry with:
  - **id** — unique slug (e.g. `base64`)
  - **name** — display name
  - **category** — matches `src/constants/library.ts` (e.g. Encoding, Security)
  - **roles** — e.g. `frontend`, `backend`, `devops`, `security`, `data`
  - **icon** — Material Symbol or Lucide name
  - **platforms** — `desktop`, `web`, or both
  - **rustCommand** — Tauri command name (e.g. `tool_base64_encode`)
  - **keywords** — optional array for search

### g. Create `docs/tools/<tool-name>.md`

- Add a short doc for the tool: what it does, input/output, and any caveats. See existing docs in `docs/tools/` for the format.

---

## 3. Code style

### TypeScript

- Use **TypeScript strict mode** — no implicit `any`.
- Prefer **named exports** over default exports (except for tool page components).
- Use **const** for all declarations unless mutation is required.
- **File names:** PascalCase for components, camelCase for utilities.
- Add **JSDoc comments** to exported functions and types.

### Rust

- All **public functions** must have **doc comments (`///`)** with an example.
- Use **thiserror** for error types — never panic in library code.
- **Return `Result<T, E>`** for all fallible operations.
- **Derive** `Debug`, `Clone`, `Serialize`, `Deserialize` on all public structs.

### Serialisation

- Use **serde** for all Rust/TypeScript data exchange.
- All Tauri commands **receive and return named structs** — not primitives.
- Use **`serde rename_all = "camelCase"`** for JSON field names.

### When generating code

- Follow the pattern in the **nearest similar existing file**.
- Add the function to the **relevant module export**.
- Include the **test alongside the implementation**.
- **Update the registry** if adding a new tool.

---

## 4. Branch naming

- **`feature/<tool-name>`** — new tools or features (e.g. `feature/base64`, `feature/jwt-decode`).
- **`fix/<issue>`** — bug fixes (e.g. `fix/encoding-utf8`, `fix/123` for issue number).
- **`docs/<topic>`** — documentation only (e.g. `docs/architecture`, `docs/base64-tool`).

---

## 5. Commit messages

Use clear, conventional-style messages so history and changelogs stay readable.

**Format:** `<type>(<scope>): <short description>`

**Examples:**

- `feat(tool): add base64 encoder`
- `fix(encoding): handle invalid UTF-8 in URL decode`
- `docs(tools): add JWT decoder usage`
- `chore(deps): bump instrument-core deps`

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

---

## 6. Pull request checklist

Before submitting a PR, confirm:

- [ ] **Environment** — Code builds and tests pass locally (`cargo test` in `src-core`, `pnpm build`, and `pnpm test` if applicable).
- [ ] **New tool (if any)** — All seven steps in [Adding a new tool](#2-adding-a-new-tool) are done (core + test, desktop command, web binding, React component, registry, tool doc).
- [ ] **Code style** — TypeScript and Rust follow the [Code style](#3-code-style) rules; no direct `invoke()` or WASM imports outside the bridge.
- [ ] **Registry** — Any new tool has an entry in `src/registry/index.ts` with the required fields.
- [ ] **Docs** — New or changed behaviour is reflected in `docs/tools/<tool-name>.md` or other docs as needed.
- [ ] **Branch** — Branch name follows [Branch naming](#4-branch-naming) (e.g. `feature/base64`).
- [ ] **Commits** — Commit messages follow the [Commit message format](#5-commit-messages).

Maintainers may request changes; address feedback and keep the PR updated (rebase or merge as agreed).

---

For architecture and development planning, see `docs/ARCHITECTURE.md` and `docs/DEVELOPMENT_PLAN.md`.
