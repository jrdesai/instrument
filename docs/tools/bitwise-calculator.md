# Bitwise Calculator

Perform bitwise operations (AND, OR, XOR, NAND, NOR, NOT, shifts, rotates) and see bit analysis (popcount, leading/trailing zeros, power-of-two check). All operations are done within a chosen bit width (8, 16, 32, or 64 bits).

## Use cases

- **Flags and masks:** Combine or test flags with AND/OR (e.g. `60 & 13 = 12`).
- **Low-level debugging:** View values in binary, shift/rotate to inspect bits.
- **Permissions:** Model permission sets as bits and use AND to test, OR to add.
- **Encoding:** Use XOR for simple toggle or rotate for bit reordering.

## Operations

**Two-operand (need both Value A and Value B)**  
- **AND** — `a & b`  
- **OR** — `a | b`  
- **XOR** — `a ^ b`  
- **NAND** — `!(a & b)` within bit width  
- **NOR** — `!(a | b)` within bit width  

**Single-operand (only Value A)**  
- **NOT** — `!a` within bit width (e.g. 60 in 8 bits → 195)  
- **Shift left** — `a << shift` (shift amount in footer)  
- **Shift right** — `a >> shift`  
- **Rotate left** — `a.rotate_left(shift)`  
- **Rotate right** — `a.rotate_right(shift)`  

**Bit analysis of A**  
- **1 bits (popcount)** — number of set bits  
- **Leading zeros** — zeros before the first 1  
- **Trailing zeros** — zeros after the last 1  
- **Power of two** — Yes if A is 1, 2, 4, 8, …

## Bit width

All operations use the selected width (8, 16, 32, or 64). Values are masked to that many bits; NOT and NAND/NOR are done in that width (e.g. NOT 60 in 8 bits = 195, not a negative number). Shift amount is limited to 0..(width−1).

## Input base

Value A and B can be entered in **Dec**, **Hex**, **Bin**, or **Oct**. Optional prefixes (`0x`, `0b`, `0o`) are stripped. Invalid characters for the chosen base produce an error.
