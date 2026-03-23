# AES Encrypt / Decrypt

Encrypt or decrypt text using AES-256-GCM authenticated encryption. All processing happens locally — no data leaves your device.

## Use cases

- **Secure notes**: Encrypt sensitive text before storing or sharing it
- **Config secrets**: Encrypt API keys or connection strings for safe storage
- **Decrypt ciphertext**: Decrypt previously encrypted data using the same password

## Modes

### Encrypt

Enter plaintext and a password. The tool outputs a base64-encoded ciphertext string that contains the encrypted data and all parameters needed for decryption (salt, nonce). The output is self-contained — only the password is needed to decrypt.

### Decrypt

Paste the ciphertext produced by the Encrypt mode and enter the same password. The tool recovers the original plaintext.

## Security details

| Parameter | Value |
|-----------|-------|
| Cipher | AES-256-GCM |
| Key derivation | PBKDF2-HMAC-SHA256 |
| Iterations | 100,000 |
| Salt | 16 bytes, random per encryption |
| Nonce (IV) | 12 bytes, random per encryption |
| Auth tag | 16 bytes (GCM standard) |

- **AES-256-GCM** provides both confidentiality and integrity — tampering with the ciphertext is detected
- **PBKDF2** with 100,000 iterations slows brute-force attacks on weak passwords
- **Random salt and nonce** mean the same plaintext + password produces a different ciphertext every time
- Output format: `base64(salt || nonce || ciphertext || auth_tag)`

## Caveats

- Security depends on password strength — use a strong, unique password
- The ciphertext includes the salt and nonce in plaintext (this is standard and does not weaken security)
- This tool does not store passwords or ciphertext

## Implementation

- **Rust**: `src-core/instrument-core/src/crypto/aes.rs`
  - `AesInput { mode: "encrypt" | "decrypt", text: String, password: String }`
  - `AesOutput { result: String, error: Option<String> }`
  - Uses `aes-gcm` crate for AES-256-GCM, `pbkdf2` crate for key derivation
- **Frontend**: `src/tools/aes-encrypt-decrypt/AesEncryptDecryptTool.tsx`
- **Registry**: `sensitive: true` — history is never recorded for this tool

## Platforms

Desktop and web.
