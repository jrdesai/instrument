# DNS Lookup

Resolve DNS records using the OS-configured resolver (for example `/etc/resolv.conf` on macOS/Linux or the Windows DNS settings).

Supported record types:

- `A`
- `AAAA`
- `MX`
- `TXT`
- `CNAME`
- `NS`

This tool is desktop-only because DNS resolution requires OS-level network APIs unavailable in WASM.

## CLI

```bash
instrument dns example.com
instrument dns example.com -t mx
instrument dns example.com -t txt --json
```

