# RSA Key Pair Generator

Generate RSA public/private key pairs locally. All cryptographic operations run on-device — no keys are transmitted anywhere.

## Options

**Key size** — 2048, 3072, or 4096 bits.

- 2048-bit: Fast generation. Suitable for most use cases today.
- 3072-bit: Transitional security level.
- 4096-bit: Maximum security. Generation takes a few seconds.

**Format**

- PKCS#8 (recommended): `-----BEGIN PRIVATE KEY-----` / `-----BEGIN PUBLIC KEY-----`. Modern standard, accepted by most libraries and tools.
- PKCS#1 (traditional): `-----BEGIN RSA PRIVATE KEY-----` / `-----BEGIN RSA PUBLIC KEY-----`. Required by some older tools.

## Use cases

- Generate keys for JWT signing (RS256/RS512)
- Create keys for TLS certificate requests
- Generate SSH key material for testing
- Produce keys for local encryption workflows

## Security

The private key is generated entirely locally using a cryptographically secure random number generator. Never share your private key. The "Keep secret" badge is a reminder — this tool does not enforce any storage policy.
