# chmod Calculator

Parse any Unix permission string and see all three representations with a plain-English breakdown.

## Accepted input

- Octal: `755`, `644`, `0755`
- Symbolic: `rwxr-xr-x`, `rw-r--r--`
- 10-char with type prefix: `-rwxr-xr-x`

## Output

- Octal, symbolic, decimal representations
- Ready-to-run `chmod` command
- Per-class breakdown (owner / group / others)
- Special bits (setuid, setgid, sticky) explained

## Common values

| Octal | Symbolic  | Use case               |
| ----- | --------- | ---------------------- |
| 755   | rwxr-xr-x | Scripts, directories   |
| 644   | rw-r--r-- | Regular files          |
| 600   | rw------- | SSH keys, private files |
| 777   | rwxrwxrwx | World-writable (avoid) |
| 400   | r-------- | Read-only certificates |
