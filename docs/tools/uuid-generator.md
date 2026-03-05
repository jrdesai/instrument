# UUID Generator

Generate UUIDs (Universally Unique Identifiers) in versions **V4** (random) and **V7** (time-ordered).

## V4 vs V7

- **V4 — Random**
  - UUIDs are generated from random bytes.
  - Most widely used and supported.
  - Good default for general-purpose identifiers.

- **V7 — Time-ordered**
  - UUIDs encode a timestamp plus random bits.
  - Values are roughly sortable by creation time.
  - Well-suited for database primary keys and indexes:
    - New rows append at the end of the index
    - Fewer page splits and better cache locality vs random V4

Use **V4** when you just need unique IDs and don’t care about ordering.  
Use **V7** when you want IDs that sort by creation time (e.g. log/event IDs, database PKs).

## Input

- **Version:** V4 or V7.
- **Count:** Number of UUIDs to generate (1–100).
- **Uppercase:** Whether to render hex letters as `A–F` instead of `a–f`.

## Output

- **UUID list:** One UUID per line, in standard canonical form:

  `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

- Length is always 36 characters including hyphens.

## Options

| Option     | Description                                                               |
|-----------|---------------------------------------------------------------------------|
| Version   | V4 (random) or V7 (time-ordered).                                         |
| Count     | How many UUIDs to generate (1–100).                                       |
| Uppercase | When enabled, UUIDs use `A–F`; otherwise `a–f`.                           |

## Examples

Examples are illustrative; real UUIDs will be different each time.

- **V4 (random), count 1:**

  `550e8400-e29b-41d4-a716-446655440000`

- **V7 (time-ordered), count 3:**

  ```text
  018f8c08-3b5b-7c45-b2a1-9a2c3d4e5f60
  018f8c08-3b5b-7c45-b2a1-9a2c3d4e5f61
  018f8c08-3b5b-7c45-b2a1-9a2c3d4e5f62
  ```

  Later UUIDs sort after earlier ones, making them ideal for ordered logs or PKs.

