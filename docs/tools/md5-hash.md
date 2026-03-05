# MD5 Hash

Compute MD5 (128-bit) hashes of text. One-way only; suitable for checksums and non-security use.

## Security warning

**MD5 is cryptographically broken.** Do not use it for:

- Passwords or password verification (use a proper KDF or Argon2/bcrypt)
- Digital signatures or integrity where collision resistance matters
- Any security-sensitive application

MD5 is still acceptable for:

- Non-security checksums (e.g. cache keys, file deduplication)
- Legacy compatibility where MD5 is required
- Quick fingerprinting where collision attacks are not a concern

## Use cases

- Checksums for files or strings (e.g. cache keys, ETags)
- Legacy systems that require MD5
- Quick comparison of text (e.g. “did this string change?”)

## Input

- **Text:** Any UTF-8 string. Empty string is valid and returns the MD5 of the empty input.

## Output

- **Hash:** 32 hexadecimal characters (lowercase `a–f` or uppercase `A–F` depending on option).
- **Length:** Always 32 (MD5 output is 128 bits = 16 bytes = 32 hex chars).

## Options

| Option     | Description                                      |
|-----------|---------------------------------------------------|
| Uppercase | When enabled, output uses `A–F`; otherwise `a–f`. |

## Examples

| Input   | Hash (lowercase)                          |
|--------|--------------------------------------------|
| (empty) | `d41d8cd98f00b204e9800998ecf8427e`       |
| `hello` | `5d41402abc4b2a76b9719d911017c592`       |

Uppercase for `hello`: `5D41402ABC4B2A76B9719D911017C592`.
