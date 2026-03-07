# Number Base Converter

Convert a number between decimal, hexadecimal, binary, octal, Crockford Base32, and base36. Enter a value in one base and see the equivalent in all others. Supports optional prefixes and bit-width padding for binary.

## Use cases

- **Hex ↔ decimal:** Quick conversion for addresses, colours, or flags.
- **Binary view:** See the bit pattern for a number; use bit width to pad to 8/16/32/64 bits.
- **Base32/Base36:** Encode integers in compact, URL-safe forms (e.g. Crockford Base32).
- **Prefixed input:** Paste `0xFF`, `0b11111111`, or `0o377` and get correct conversion.

## Supported bases

- **Decimal:** 0–9.
- **Hexadecimal:** 0–9, a–f (or A–F). Optional prefix `0x` / `0X` is stripped.
- **Binary:** 0–1. Optional prefix `0b` / `0B` is stripped.
- **Octal:** 0–7. Optional prefix `0o` / `0O` is stripped.
- **Base32:** Crockford Base32 (0–9, A–V, excluding I, L, O, U). Decoding accepts I/L→1, O→0.
- **Base36:** 0–9, a–z (or A–Z).

A leading minus sign is allowed; the magnitude is converted and **Is negative** is set in the output.

## Bit width

Only affects **binary** and **binary (grouped)** output:

- **Auto:** No padding; use the minimum number of bits (e.g. 255 → 8 bits).
- **8 / 16 / 32 / 64:** Pad binary to that many bits (e.g. 1 with width 8 → `00000001`).

Binary grouped shows the same bits in groups of 4 separated by spaces.

## Maximum value

Values are handled internally as **u128**. The maximum is **2^128 − 1** (u128::MAX). Larger values or invalid characters produce a clear error (e.g. invalid character or “exceeds maximum”).
