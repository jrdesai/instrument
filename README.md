# Instrument

**Cross-platform developer utility toolkit.**

> Screenshot coming soon

## Features

- **Encoding** — Base64, URL, HTML entities, Hex
- **Crypto** — MD5, SHA-256, SHA-512, UUID, ULID, API key generator
- **Text** — Case converter, Word counter, String escaper, Find & Replace, Lorem Ipsum generator

Tools run in a Tauri desktop app or in the browser via WASM. More categories (JSON, datetime, etc.) are planned; see `docs/DEVELOPMENT_PLAN.md`.

## Tech stack

- **Tauri 2** — Desktop shell
- **Rust** — Core logic (`instrument-core`), desktop commands (`instrument-desktop`), WASM bindings (`instrument-web`)
- **React 19** + **TypeScript** + **Vite**
- **Tailwind v4** — Styling
- **Zustand** — State
- **pnpm** — Package manager

## Prerequisites

- **Node.js** 22+
- **Rust** 1.80+
- **pnpm** 9+

## Getting started

```bash
git clone https://github.com/jrdesai/instrument.git
cd instrument
pnpm install
pnpm run dev
```

The app opens in a window. Use the sidebar to open the Library and run any tool.

## Building

```bash
pnpm run build
```

Output is in `src-tauri/target/release/` (or `debug/` for unoptimized builds).

**Web (WASM):**
​```bash
pnpm run build:wasm   # run once before web mode
pnpm run build:web    # produces /dist for browser deployment
​```

## Running tests

**Rust (core library):**

```bash
cargo test --manifest-path src-core/Cargo.toml -p instrument-core
```

**TypeScript:**

```bash
pnpm run typecheck
pnpm run test:ts
pnpm run lint
pnpm run check:pure
```

## Project structure

| Path        | Description |
|------------|-------------|
| `src/`     | React frontend — UI, tools, store, registry, bridge |
| `src-core/` | Rust crates: `instrument-core` (shared logic), `instrument-desktop` (Tauri commands), `instrument-web` (WASM exports) |
| `src-tauri/` | Tauri app shell, capabilities, permissions |
| `docs/`    | Design reference, development plan, per-tool docs |

## Contributing

See `docs/` for design tokens, tool patterns, and the development plan. Add new tools by following the existing Rust → Tauri/WASM → React flow and register them in `src/registry/index.ts`.

## License

MIT
