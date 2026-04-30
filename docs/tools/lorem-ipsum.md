# Lorem Ipsum Generator

Generate placeholder text as paragraphs, sentences, or individual words from a fixed grammatical corpus (not random word soup).

## Use cases

- **Design** — Fill wireframes and mockups with realistic-looking copy.
- **Testing** — Populate fields or documents with variable-length text.
- **Demos** — Show layout and typography without real content.

## Output types

| Type | Description |
|------|-------------|
| **Paragraphs** | *Count* paragraphs, each with a configurable number of sentences (1–10). Paragraphs are separated by a blank line. |
| **Sentences** | Exactly *count* sentences, space-separated. |
| **Words** | Exactly *count* words, space-separated. |

## Options

- **Count** — Depends on type (roughly 1–15 paragraphs, 1–30 sentences, 10–200 words). Maximum allowed by the engine is 200.
- **Sentences / paragraph** — Paragraph mode only: how many sentences each paragraph contains (1–10).
- **Start with "Lorem ipsum..."** — When on, the first paragraph/sentence/word uses the classic opening. When off, generation follows the corpus from the current offset.
- **HTML output** — When on, the UI shows each paragraph wrapped in `<p>…</p>` as markup in a code block; copy uses that form. Plain mode renders readable paragraphs.
- **Regenerate** — Picks a new random offset into the corpus so you get different text without changing other sliders.

## Behaviour

The tool auto-generates when you change options (debounced). History captures successful runs after a short delay. **Regenerate** changes only the starting offset in the sentence/word pool.

## Input / output

- **Input:** Options only (no text input). The desktop CLI supports `--offset` and `--sentences-per-paragraph` in addition to type, count, and classic start.
- **Output:** Generated text plus word, sentence, and paragraph counts for the result.
