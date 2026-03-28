# Hash

Compute cryptographic digests for UTF-8 text in one place: **MD5**, **SHA-1**, **SHA-256**, **SHA-512**, **SHA3-256**, and **SHA3-512**. All six run together on every invocation.

## Output formats

- **Hex** (default) — lowercase or uppercase.
- **Base64** — standard alphabet with padding when needed.
- **Base64url** — URL-safe alphabet without padding.

## HMAC mode

Enter an optional **HMAC key** to run **HMAC** with each listed algorithm using that secret. The key field is a password input and is not stored in drafts; history entries redact the key as `[redacted]` when present.

## Options

| Option           | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| Hash empty input | When off, whitespace-only input yields empty results. When on, empty/whitespace is hashed. |
| Uppercase        | Applies to hex output only.                                                 |
| Format           | Hex, Base64, or Base64url.                                                  |

## Output

- One row per algorithm with a per-row **Copy** action.
- **Copy all** produces a plain-text block:

  ```text
  MD5:        <value>
  SHA-1:      <value>
  SHA-256:    <value>
  SHA-512:    <value>
  SHA3-256:   <value>
  SHA3-512:   <value>
  ```

## Notes

- MD5 and SHA-1 are weak for security-sensitive use; prefer SHA-256 or SHA3-256 for new designs.
- All processing runs locally on your device (desktop native Rust or web WASM).
