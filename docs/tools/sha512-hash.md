# SHA-512 Hash

Compute SHA-512 (512-bit) hashes of text. One-way; suitable for checksums, data integrity, and high-security applications.

## Security note

**SHA-512 is cryptographically strong** and produces a larger output (512 bits) than SHA-256 (256 bits). It is preferred for:

- High-security applications (e.g. certificates, long-term signatures)
- Situations where stronger collision resistance is required
- Compatibility with systems that standardise on SHA-512

Like SHA-256, it is suitable for checksums, data integrity, digital signatures, and secure hashing.

## Use cases

- File or string checksums where SHA-512 is required or preferred
- Digital signatures and certificate chains (when SHA-512 is specified)
- Content addressing and integrity verification
- High-security hashing where the larger output is desired

## Input

- **Text:** Any UTF-8 string. Empty or whitespace-only input can be hashed only when **Hash empty string** is enabled.

## Output

- **Hash:** 128 hexadecimal characters (lowercase `a–f` or uppercase `A–F` depending on option).
- **Length:** 128 when a hash is returned; 0 when input is empty and **Hash empty string** is off.

## Options

| Option             | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Uppercase          | When enabled, output uses `A–F`; otherwise `a–f`.                          |
| Hash empty string  | When enabled, empty or whitespace-only input returns the hash of `""`.      |

## Examples

| Input   | Hash (lowercase)                                                                                                                                                                                                                |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| (empty) | `cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e`                                                                                               |
| `hello` | `9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043`                                                                                               |

Uppercase for `hello`: use the same hex with `A–F` instead of `a–f`.
