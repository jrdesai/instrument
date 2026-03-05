# API Key Generator

Generate secure, random API keys with configurable length, format, and charset. All keys are **generated locally** and never transmitted.

## Security note

- Keys are generated in your browser / desktop process using a cryptographically secure RNG.
- Nothing is sent to any server.
- You are responsible for **storing** and **rotating** keys securely.

## Formats

- **Raw**  
  Continuous string of characters, e.g.  
  `xK9mN2pL8qR4vT7wY1zA3bC6dE0fG5h`

- **Grouped**  
  Groups of 4 characters separated by dashes for readability, e.g.  
  `xK9m-N2pL-8qR4-vT7w`  
  - Length is rounded **up** to the nearest multiple of 4 for grouping.

- **Prefixed**  
  Custom prefix followed by the raw key, e.g.  
  `sk_live_xK9mN2pL8qR4vT7wY1zA3bC6dE0fG5h`  
  - Prefix is at most 32 characters.
  - Useful for distinguishing key types (e.g. `sk_` vs `pk_`).

## Charsets

- **Alphanumeric** – `a-z A-Z 0-9`  
- **Alpha** – `a-z A-Z` only  
- **Hex** – `0-9 a-f` (hexadecimal)  
- **URL Safe** – `a-z A-Z 0-9 - _` (no spaces or special characters)

## Best practices

- **Use URL Safe** for keys embedded in URLs or HTTP headers.
- **Use Grouped** format for keys shown to users (easier to read over the phone or in UIs).
- **Use Prefixed** format to distinguish environments or roles, e.g.:
  - `sk_live_` / `sk_test_` for secret keys
  - `pk_live_` / `pk_test_` for public keys.
- **Minimum length:** 32 characters is recommended for production keys.
- **Rotation:** rotate keys regularly and revoke compromised keys.

## Input

- **Prefix:** Optional string (up to 32 chars). Used only in **Prefixed** format.
- **Length:** Total key length (8–256). For **Grouped**, rounded up to a multiple of 4.
- **Format:** Raw, Grouped, or Prefixed.
- **Charset:** Alphanumeric, Alpha, Hex, or URL Safe.
- **Count:** Number of keys to generate (1–100).

## Output

- **Key list:** One key per line.  
- **Copy controls:** Per-key Copy and “Copy all” (newline-separated).
- **Clear:** Clears the list while preserving your options.

## Examples

Examples are illustrative; actual keys will differ each time.

- **Raw, length 32, Alphanumeric:**

  `xK9mN2pL8qR4vT7wY1zA3bC6dE0fG5h`

- **Grouped, length 16, Alphanumeric:**

  `xK9m-N2pL-8qR4-vT7w`

- **Prefixed, length 32, Alphanumeric, prefix `sk_live_`:**

  `sk_live_xK9mN2pL8qR4vT7wY1zA3bC6dE0fG5h`

