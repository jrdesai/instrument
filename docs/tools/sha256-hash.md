# SHA-256 Hash

Compute SHA-256 (256-bit) hashes of text. One-way; suitable for checksums, data integrity, and digital signatures.

## Security note

**SHA-256 is cryptographically strong.** Unlike MD5 (which is cryptographically broken), SHA-256 is suitable for:

- Checksums and data integrity (e.g. file verification)
- Digital signatures and certificates
- Password hashing (when used with a proper KDF like PBKDF2 or Argon2)
- Any application requiring collision resistance

## Use cases

- File or string checksums (e.g. integrity verification)
- Digital signatures and certificate chains
- Commit hashes, content addressing
- Secure hashing where MD5 is not acceptable

## Input

- **Text:** Any UTF-8 string. Empty or whitespace-only input can be hashed only when **Hash empty string** is enabled.

## Output

- **Hash:** 64 hexadecimal characters (lowercase `a–f` or uppercase `A–F` depending on option).
- **Length:** 64 when a hash is returned; 0 when input is empty and **Hash empty string** is off.

## Options

| Option             | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Uppercase          | When enabled, output uses `A–F`; otherwise `a–f`.                            |
| Hash empty string  | When enabled, empty or whitespace-only input returns the hash of `""`.     |

## Examples

| Input   | Hash (lowercase)                                                                                                                                 |
|--------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| (empty) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`                                                                               |
| `hello` | `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`                                                                               |

Uppercase for `hello`: `2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824`.
