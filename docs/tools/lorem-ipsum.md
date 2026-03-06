# Lorem Ipsum Generator

Generate placeholder text as paragraphs, sentences, or individual words. Uses a fixed corpus so output is deterministic: the same options always produce the same text.

## Use cases

- **Design** — Fill wireframes and mockups with realistic-looking copy.
- **Testing** — Populate fields or documents with variable-length text.
- **Demos** — Show layout and typography without real content.

## Output types

| Type | Description |
|------|--------------|
| **Paragraphs** | Each paragraph has 3–6 sentences from the corpus. Paragraphs are separated by a blank line. |
| **Sentences** | Exactly *count* sentences, space-separated. |
| **Words** | Exactly *count* words, space-separated. |

## Options

- **Count** — 1–50. Number of paragraphs, sentences, or words to generate.
- **Start with "Lorem ipsum..."** — When on, the first paragraph/sentence/word starts with the classic “Lorem ipsum dolor sit amet…” opening. When off, generation starts from the main corpus.

## Deterministic generation

The tool does not use random selection. It cycles through the embedded corpus in a fixed order, so the same type, count, and “start with classic” setting always produce the same output. This makes the tool predictable and easy to use in tests or reproducible layouts.

## Input / output

- **Input:** Options only (no text input).
- **Output:** Generated text plus counts: word count, sentence count, and paragraph count for the result.

## Examples

- Type: Paragraphs, Count: 3, Start classic: on → 3 paragraphs, first begins with “Lorem ipsum dolor sit amet…”.
- Type: Sentences, Count: 5 → 5 sentences.
- Type: Words, Count: 20 → 20 words.
- Same options twice → identical output.
