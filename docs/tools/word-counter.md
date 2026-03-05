# Word Counter

Count words, characters (with and without spaces), lines, sentences, paragraphs, unique words, average word length, and estimated reading time.

## Use cases

- **Writers and editors** — Hit word or character targets, check paragraph count.
- **Students** — Meet assignment length (word count, page estimates).
- **Content and SEO** — Meta descriptions, title length, readability.
- **Developers** — Log messages, commit message length, comment limits.

## Stats explained

| Stat | Description |
|------|-------------|
| **Words** | Tokens separated by whitespace (empty strings ignored). |
| **Characters** | Total characters including spaces. |
| **Characters (no spaces)** | Characters excluding any whitespace. |
| **Lines** | Non-empty lines (split on newline). |
| **Sentences** | Heuristic: count of `.`, `!`, `?`. Not perfect (e.g. "Dr. Smith" counts as two). |
| **Paragraphs** | Blocks separated by double newline (`\n\n`), non-empty only. |
| **Unique words** | Distinct words after lowercasing and stripping punctuation. |
| **Avg word length** | Sum of word lengths ÷ word count. `0` when there are no words. |
| **Reading time** | Based on 200 words per minute; shown as "< 1 min", "1 min", or "X mins". |

## Sentence detection

Sentence count uses a simple heuristic: it counts occurrences of `.`, `!`, and `?`. This works well for normal prose but can over-count (e.g. abbreviations like "Dr." or "U.S.A.") or under-count (e.g. sentences ending with ellipses or no terminal punctuation). For strict grammar-based sentence boundaries, use a dedicated NLP tool.

## Input / output

- **Input:** Plain text (any length). Empty input returns all zeros and no error.
- **Output:** All stats are returned in one payload; the UI shows them in a grid. No copy-as-unit; individual stats can be read from the cards.

## Options

None. The tool analyses whatever is in the input. Analysis runs automatically as you type (debounced).

## Examples

- *"The quick brown fox jumps over the lazy dog."* → 9 words, 44 characters, 36 characters (no spaces), 1 line, 1 sentence, 9 unique words, reading time &lt; 1 min.
- *"Hello.\\n\\nWorld!"* → 2 lines, 2 paragraphs, 2 sentences.
- *"the cat sat on the mat"* → 6 words, 5 unique words (*the* appears twice).
