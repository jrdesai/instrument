# Password Generator

Generate secure, random passwords with configurable length, character sets, and strength
indicator. All passwords are **generated locally** and never transmitted.

## Security note

- Passwords are generated using a cryptographically secure RNG (`rand::thread_rng` backed
  by the OS entropy source).
- Nothing is sent to any server.
- Generated passwords are stored in tool history by default. If you'd rather not keep them,
  clear history from the sidebar or set `sensitive: true` in the registry entry.

## Character sets

| Set               | Characters                          |
|-------------------|-------------------------------------|
| Uppercase         | `A–Z` (26 chars)                    |
| Lowercase         | `a–z` (26 chars)                    |
| Numbers           | `0–9` (10 chars)                    |
| Symbols (default) | `!@#$%^&*()-_=+[]{}|;:,.<>?` (27 chars) |

At least one set must be enabled. Selecting multiple sets increases the alphabet size and
therefore the entropy.

### Exclude ambiguous characters

When enabled, the following characters are removed from the alphabet regardless of which
sets are on: `0 O o 1 I l`

These characters look similar in many fonts and can cause transcription errors when
passwords are read from a screen.

### Custom symbol set

When **Symbols** is enabled you can replace the default symbol set with your own. Enter any
characters you want; duplicates are silently removed. Useful when a site restricts which
special characters are allowed.

## Strength and entropy

Entropy is calculated as:

```
entropy_bits = length × log₂(alphabet_size)
```

This is the theoretical Shannon entropy of a uniformly-random password drawn from the
alphabet — an indicator of brute-force search space, not a formal security rating.

| Tier       | Entropy          | Colour     |
|------------|------------------|------------|
| Weak       | < 40 bits        | Red        |
| Fair       | 40–59 bits       | Orange     |
| Strong     | 60–79 bits       | Yellow     |
| Very Strong| ≥ 80 bits        | Green      |

The strength bar fills `min(5, floor(entropy / 20))` of 5 segments as a visual cue.

**Recommended minimum:** 80+ bits (Very Strong). A 16-character password drawn from all
four character sets (≈ 95 chars) gives roughly 105 bits of entropy.

## Options

| Option              | Range / Default     | Notes                                      |
|---------------------|---------------------|--------------------------------------------|
| Length              | 4–128 (default 16)  | Slider + number input, step 1              |
| Count               | 1–10 (default 1)    | Stepper with `–` / `+` buttons             |
| Uppercase           | on by default       |                                            |
| Lowercase           | on by default       |                                            |
| Numbers             | on by default       |                                            |
| Symbols             | off by default      | Reveals custom symbol input when enabled   |
| Exclude ambiguous   | off by default      | Removes `0 O o 1 I l`                      |

## Behaviour

- **Auto-regenerate**: New passwords are generated automatically 150 ms after any setting
  change. History is not captured on these calls (`skipHistory: true`).
- **Regenerate button**: Generates fresh passwords immediately without changing any setting.
- **Copy per-password**: Each row has a Copy button that copies that password to the
  clipboard and shows "Copied" for 1.5 s.
- **Copy all**: Copies all generated passwords joined by newlines.

## Examples

| Settings                                    | Typical entropy |
|---------------------------------------------|-----------------|
| Length 8, uppercase only                    | ~38 bits (Weak) |
| Length 12, upper + lower + numbers          | ~71 bits (Strong) |
| Length 16, all four sets                    | ~105 bits (Very Strong) |
| Length 20, all four sets, exclude ambiguous | ~128 bits (Very Strong) |

Actual entropy values are shown live in the UI.
