# Text Case Converter

Convert any input text into multiple case styles at once (camelCase, PascalCase, snake_case, etc.).

## Supported formats

- **camelCase** – `helloWorldExample`
- **PascalCase** – `HelloWorldExample`
- **snake_case** – `hello_world_example`
- **SCREAMING_SNAKE_CASE** – `HELLO_WORLD_EXAMPLE`
- **kebab-case** – `hello-world-example`
- **Title Case** – `Hello World Example`
- **UPPER CASE** – `HELLO WORLD EXAMPLE`
- **lower case** – `hello world example`
- **dot.case** – `hello.world.example`
- **path/case** – `hello/world/example`

## Input

- Free-form text: sentences, identifiers, or mixed formats.
- The converter:
  - Splits on spaces, underscores, hyphens, dots, and slashes.
  - Detects camelCase and PascalCase boundaries.
  - Preserves acronyms: `"parseHTMLEntity"` → `["parse", "HTML", "Entity"]`.

## Behaviour

- Converts to **all** formats simultaneously.
- Updates automatically as you type (debounced).
- Shows a live **word count** based on detected words.
- Each format has its own Copy button; “Copy all” copies all formats in a readable list.

## Examples

**Input:** `hello world`

- camelCase: `helloWorld`
- PascalCase: `HelloWorld`
- snake_case: `hello_world`
- SCREAMING_SNAKE_CASE: `HELLO_WORLD`
- kebab-case: `hello-world`
- Title Case: `Hello World`
- UPPER CASE: `HELLO WORLD`
- lower case: `hello world`
- dot.case: `hello.world`
- path/case: `hello/world`

**Input:** `helloWorld` (camelCase)

- snake_case: `hello_world`
- kebab-case: `hello-world`

**Input:** `HELLO_WORLD` (SCREAMING_SNAKE_CASE)

- camelCase: `helloWorld`
- kebab-case: `hello-world`

