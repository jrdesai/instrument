# Bcrypt Tool

Hash passwords with bcrypt and verify password/hash pairs locally. All processing happens on-device — no passwords or hashes are transmitted anywhere.

## Modes

### Hash

Enter a password and select a cost factor, then click **Hash**. The output is a bcrypt hash string (e.g. `$2b$12$…`) safe to store in a database. Each click produces a **different hash** for the same password because bcrypt generates a new random salt every time — this is correct behaviour.

### Verify

Enter a password and paste an existing bcrypt hash, then click **Verify**. The tool reports whether the password produced that hash. Use this to test login logic without writing code.

## Cost factor

The cost factor controls how slow the hash computation is:

| Cost | Approx. time (desktop) | Use case |
|------|------------------------|----------|
| 10   | ~100 ms | Fast testing |
| 11   | ~200 ms | Low-latency APIs |
| 12   | ~400 ms | OWASP recommended default |
| 13   | ~800 ms | Higher-security systems |

Higher costs take proportionally longer in the browser (WASM) than on desktop. Cost 12 is the default and the right choice for most applications.

## Hash format

Bcrypt hashes follow the `$2b$` format:

```
$2b$12$<22-char base64 salt><31-char base64 hash>
```

- `2b` — bcrypt version
- `12` — cost factor
- Next 22 chars — salt (randomly generated per hash)
- Last 31 chars — the hash

## Security notes

- Never store plaintext passwords — store the bcrypt hash
- Never compare hashes with `==` in application code — use your library's `verify` function (it handles timing-safe comparison)
- bcrypt truncates passwords longer than 72 bytes; for very long passwords consider prehashing with SHA-256 before bcrypt
- This tool does not store passwords, hashes, or results anywhere

## Implementation

- **Rust**: `src-core/instrument-core/src/crypto/bcrypt_tool.rs`
  - `BcryptInput { mode: String, password: String, cost: u32, hash: String }`
  - `BcryptOutput { hash: String, matches: Option<bool>, error: Option<String> }`
  - Uses the `bcrypt` crate (Blowfish-based, pure Rust)
- **Frontend**: `src/tools/bcrypt/BcryptTool.tsx`
- **Registry**: `sensitive: true` — history is never recorded for this tool

## Platforms

Desktop and web.
