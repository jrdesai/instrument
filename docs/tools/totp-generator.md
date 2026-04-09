# TOTP Generator

Generates time-based one-time passwords from a **base32** TOTP secret. Useful for checking that an authenticator app or service shows the same code as expected. All computation runs locally (native Rust on desktop, WASM in the browser).

## Behaviour

- Paste or type the shared secret (RFC 4648 base32; spaces are ignored).
- Chooses **algorithm** (SHA-1, SHA-256, SHA-512), **digits** (6 or 8), and **period** (30s or 60s) to match your issuer settings.
- The current code and a short countdown reflect the **Unix timestamp** from the client (`Date.now()` on web/desktop UI); Rust does not read the system clock itself so results stay deterministic in tests and WASM.

## Privacy

This tool is marked **sensitive**: the secret is not written to disk, tool history, or logs. Tray clipboard seeding uses the same ephemeral bootstrap path as other security tools.

## Related

- Core implementation: `instrument-core` → `crypto::totp`
- Command: `tool_totp_generate`
