# ULID Generator

Generate ULIDs (Universally Unique Lexicographically Sortable Identifiers).

ULIDs are:

- **Time-sortable** – lexicographic order matches creation time
- **URL-safe** – only alphanumeric Crockford Base32 characters
- **Case-insensitive** – uppercase and lowercase are equivalent
- **Monotonically increasing** – sequential ULIDs grow over time

## ULID vs UUID

- **Format**
  - UUID: 36 chars with hyphens (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
  - ULID: 26 chars, Crockford Base32 (e.g. `01ARZ3NDEKTSV4RRFFQ69G5FAV`)
- **Ordering**
  - UUID v4: random; no inherent sort order.
  - ULID: includes a timestamp prefix; lexicographic sort ≈ creation order.
- **Usage**
  - UUID: general-purpose, widely supported.
  - ULID: ideal where sort order and URL-safety matter.

## When to use ULID over UUID

- Database primary keys where **insert order** and **index locality** matter.
- Distributed systems needing **globally unique, time-ordered IDs**.
- Anywhere UUIDs are used, but you want:
  - Shorter, denser string form.
  - URL-safe identifiers without extra encoding.

## Input

- **Count:** Number of ULIDs to generate (1–100).
- **Uppercase:** Whether to render in uppercase (`A–Z`) or lowercase (`a–z`).

## Output

- **ULID list:** One ULID per line, 26 characters each.
- **Copy controls:** Per-ULID copy and “Copy all”.

## Options

| Option     | Description                                              |
|-----------|----------------------------------------------------------|
| Count     | How many ULIDs to generate (1–100).                      |
| Uppercase | When enabled, output uses uppercase; otherwise lowercase.|

## Examples

Examples are illustrative; real ULIDs will differ.

- **Count 1 (uppercase):**

  `01HV6Y3M2KXYZ1234567890ABC`

- **Count 3 (time-ordered):**

  ```text
  01HV6Y3M2KXYZ1234567890ABC
  01HV6Y3M3ABCDE234567890DEF
  01HV6Y3M3FGHIJ34567890GHJK
  ```

Later ULIDs sort after earlier ones, making them ideal for ordered logs and primary keys. 

