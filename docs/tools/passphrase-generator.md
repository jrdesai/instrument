# Passphrase Generator

Build memorable passphrases from a fixed **wordlist** embedded in the app. Each word is chosen uniformly at random; optional suffix adds a digit and/or a symbol from `!@#$%&*?`.

## Wordlist

The list contains **1296** words (4–8 letters, ASCII lowercase). Entropy per word is **log₂(1296) ≈ 10.34 bits**.

## Entropy

Displayed **entropy (bits)** is:

- **Words:** log₂(wordlist size) × number of words  
- **+ Add number:** log₂(10) when enabled  
- **+ Add symbol:** log₂(8) when enabled  

This is a Shannon-style estimate of the space from which the passphrase is drawn, not a password-strength score against guessing attacks.

## Options

| Option | Description |
|--------|-------------|
| **Words** | Words per passphrase (3–12, clamped in core). |
| **Separator** | `-`, space, `.`, `_`, or none (concatenated). |
| **Capitalize** | Uppercase first letter of each word. |
| **Add number** | Append one random digit 0–9. |
| **Add symbol** | Append one random symbol from the set above. |
| **Count** | Number of passphrases (1–20). |

## Behaviour

- Changing any option **regenerates** after a short debounce (auto-run uses `skipHistory` so history is not flooded).
- **Regenerate** runs immediately and may record **history** (same pattern as the Password Generator).
- **Copy** / **Copy all** copy the visible lines.

Use **Regenerate** or change settings until you have a passphrase you are happy to use; treat generated passphrases like any secret if you will use them for real accounts.
