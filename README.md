# Instrument

**A privacy-first developer toolkit — 76 tools, all processing happens locally on your device. No data ever leaves.**

> Screenshot coming soon

---

## Ways to use Instrument

### Desktop app
The full experience. Open the app, browse 76 tools across the Library, pin favourites to your dashboard, and keep a history of recent inputs.

Supported platforms: macOS · Windows · Linux

### Web app
No install needed — open [instrument-wqt.pages.dev](https://instrument-wqt.pages.dev) in any browser. Tool logic runs in WebAssembly compiled from the same Rust source as the desktop app. Nothing is sent to a server.

Desktop-only tools (e.g. Image Converter) are shown greyed out on the web so you know they exist.

### System tray (desktop)
Instrument lives in your menu bar / system tray. Star any tray-eligible tool and it appears in the tray menu for one-click access. Clicking a tool opens a compact 400 × 520 popover anchored below the tray icon — and automatically pre-fills it with whatever is on your clipboard.

Works without opening the main window.

### Command line
A native `instrument` binary for scripting and piping. Reads from stdin, writes to stdout. Pass `--json` for machine-readable output.

```bash
# Encode / decode
echo "hello world" | instrument base64 --encode
echo "aGVsbG8gd29ybGQ=" | instrument base64 --decode

# Hash
echo "secret" | instrument hash --algorithm sha256

# Generate
instrument uuid
instrument password --length 32

# Format / validate
cat data.json | instrument json --format
cat query.sql | instrument sql --format

# Timestamps & versions
instrument timestamp 1700000000
instrument semver bump minor 1.4.2
```

**Available subcommands:** `base64` · `url` · `hex` · `html-entity` · `slug` · `hash` · `jwt` · `uuid` · `ulid` · `nanoid` · `password` · `case` · `lines` · `word-count` · `json` · `yaml` · `xml` · `sql` · `timestamp` · `semver`

---

## Tools (76 total)

| Category | Tools |
|----------|-------|
| **Encoding** | Base64, URL Encoder, HTML Entity, Hex Converter, Color Converter, QR Code Generator, ASCII / Unicode Table |
| **Crypto** | Hash, UUID / ULID / Nano ID Generator, Password Generator, Passphrase Generator, API Key Generator, AES Encrypt/Decrypt, TOTP Generator, Certificate Decoder, RSA Key Pair Generator |
| **Auth** | JWT Decoder, Basic Auth Header |
| **JSON** | Formatter, Validator, Schema Validator, Diff, Path, Converter, Config Converter |
| **Data** | CSV ↔ JSON, CSV Previewer, XML Formatter, YAML Formatter |
| **Media** | Image Converter *(desktop only)* |
| **Network** | URL Parser, CIDR Calculator, HTTP Status Codes, cURL Builder, User-Agent Parser |
| **Text** | Case Converter, Word Counter, Find & Replace, Text Diff, Line Tools, String Escaper, Lorem Ipsum, Markdown Editor, Config Parser, Unicode Inspector, Slug Generator, Fake Data Generator, NATO Phonetic Alphabet |
| **Code** | Regex Tester, Regex Explain, HTML Formatter, HTML Previewer, SQL Formatter, Code Formatter, Keycode Info |
| **Numbers** | Number Base Converter, Semver, Unit Converter, Bitwise Calculator, chmod Calculator, Expression Evaluator, Colour Contrast Checker |
| **Date & Time** | Timestamp Converter, Timezone Converter, ISO 8601 Formatter, Cron Expression Parser |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Frontend | React 19 · TypeScript · Vite · Tailwind v4 · Zustand |
| Core logic | Rust (`instrument-core`) — shared between desktop and WASM |
| Desktop commands | `instrument-desktop` — Tauri command wrappers |
| Web / WASM | `instrument-web` — wasm-bindgen exports, compiled with wasm-pack |
| CLI | `instrument-cli` — Clap-based binary |
| Web hosting | Cloudflare Pages |
| Package manager | pnpm |

---

## Getting started

### Prerequisites

- Node.js 22+
- Rust 1.80+
- pnpm 10+

### Run the desktop app

```bash
git clone https://github.com/jrdesai/instrument.git
cd instrument
pnpm install
pnpm tauri dev
```

### Run the web version locally

```bash
pnpm run build:wasm   # compile Rust → WASM (once, or after any Rust change)
pnpm run dev:web      # Vite dev server at localhost:1420
```

---

## Building

**Desktop installer:**
```bash
pnpm run build
```
Output: `src-tauri/target/release/`

**Web (WASM + Vite):**
```bash
pnpm run build:wasm   # Rust → public/wasm-pkg/ (local dev only)
pnpm run build:web    # wasm + vite build → dist/
```

> `public/wasm-pkg/` is gitignored and never committed. CI builds WASM from source and deploys to Cloudflare Pages automatically on every push to `main`.

---

## Running tests

```bash
pnpm run typecheck          # TypeScript strict check
pnpm run lint               # ESLint
pnpm run test:ts            # Vitest
pnpm run test:rust          # cargo test (all crates)
pnpm run check:pure         # verify instrument-core has no Tauri/WASM imports
```

---

## Project structure

```
instrument/
├── src/                  # React frontend (bridge, registry, tools, components, store)
├── src-core/
│   ├── instrument-core/  # Pure Rust — all tool logic (no Tauri, no WASM deps)
│   ├── instrument-desktop/ # Tauri command wrappers
│   ├── instrument-web/   # wasm-bindgen exports
│   └── instrument-cli/   # CLI binary
├── src-tauri/            # Tauri app shell, capabilities, permissions
├── public/wasm-pkg/      # Compiled WASM — gitignored, built by CI
└── docs/                 # Architecture, design tokens, per-tool docs
```

---

## Contributing

See `docs/ARCHITECTURE.md` for the full architecture reference and `docs/DEVELOPMENT_PLAN.md` for the backlog. New tools follow a Rust core → desktop binding → WASM binding → registry → React component flow.

## License

MIT
