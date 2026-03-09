# JSON Path

Query JSON documents using JSONPath expressions and inspect the matched values with types and full-document context.

## JSONPath basics

JSONPath is to JSON what XPath is to XML: a way to address parts of a document using a concise query language.

Key concepts:

- **Root**: `$` — the root of the document.
- **Field access**: `$.store.book` or `$['store']['book']`.
- **Array index**: `$.store.book[0]` (first element).
- **Wildcard**: `*` — all children: `$.store.book[*]`.
- **Recursive descent**: `..` — search at any depth: `$..author`.
- **Filters**: `[?(@.price < 10)]` — only elements matching a condition.

## Common examples

Given:

```json
{
  "store": {
    "book": [
      { "title": "A", "price": 8.95, "author": "Alice" },
      { "title": "B", "price": 12.99, "author": "Bob" }
    ],
    "bicycle": { "color": "red", "price": 19.95 }
  }
}
```

- **All authors**: `$.store.book[*].author`
- **All authors (recursive)**: `$..author`
- **First book**: `$.store.book[0]`
- **Last book**: `$.store.book[-1]`
- **Books under $10**: `$.store.book[?(@.price < 10)]`
- **Books with ISBN**: `$..book[?(@.isbn)]`

## Dots vs recursive descent

- `.` moves **one level** down: `$.store.book` → the `book` field under `store`.
- `..` walks **all descendants**: `$..price` → any `price` field anywhere in the tree.

Use `.` when you know the exact path, and `..` when you want to search deeply for a field regardless of nesting.

## Filter expressions

Filters live inside `[?( ... )]` and let you select array elements based on conditions, for example:

- `$.store.book[?(@.price < 10)]` — books with `price < 10`
- `$..book[?(@.isbn)]` — books that have an `isbn` field

Inside a filter:

- `@` refers to the current element.
- You can use comparison operators (`<`, `>`, `==`, `!=`, `<=`, `>=`) and logical `&&`, `||` for more complex conditions.

## How this tool presents results

- **JSON document** — Paste a JSON document on the left.
- **Query bar** — Enter a JSONPath query at the top (starting after `$`).
- **Matches list** — Each match shows:
  - An index (`#1`, `#2`, …), the canonical path (e.g. `$['store']['book'][0]['title']`), and a type badge (`string`, `number`, `object`, `array`, etc.).
  - For primitives, the raw JSON value.
  - For objects/arrays, a formatted preview with syntax highlighting.
- **Copying**:
  - Copy a single match value from its card.
  - Copy all match values as a JSON array via the **Copy All** button.
- **Full document** — Expand the “Full Document” section to see the entire JSON pretty-printed, alongside your matches.

Use JSON Path when you need to quickly pull out pieces of a large JSON payload, explore nested structures, or debug complex API responses.

