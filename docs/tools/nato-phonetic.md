# NATO Phonetic Alphabet

Convert text to NATO/ICAO phonetic words (Alpha, Bravo, Charlie…) or decode phonetic words back to text.

## Modes

**Encode** — each character shown on its own line with its NATO phonetic word:

- Letters A–Z use the standard NATO/ICAO phonetic alphabet
- Digits 0–9 use the standard spoken digit names (9 = Niner)
- Spaces display as `(space)`; other characters show as their literal value

**Decode** — space-separated NATO words are converted back to their characters.
Unrecognised words produce `?`. Both "Nine" and "Niner" decode to `9`.

## Use case

Useful for spelling out passwords, API keys, or hostnames in voice communication where individual letters can be misheard (e.g. B vs D, M vs N).
