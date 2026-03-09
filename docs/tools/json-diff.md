# JSON Diff

Compare two JSON values side by side and see exactly what was added, removed, or changed, with path notation and synchronized diff panels.

## Use cases

- **API responses** — Compare before/after payloads to verify behaviour or document changes
- **Config drift** — Diff two config files (e.g. dev vs prod) to see overrides
- **Schema or fixture updates** — Check how a new version of a JSON structure differs from the old one
- **Merge and code review** — Inspect JSON blobs in commits or PRs without guessing
- **Debugging** — See which keys or array elements changed when something breaks

## How the diff algorithm works

The tool parses both inputs as JSON. If either fails to parse, it reports **Left: invalid JSON** or **Right: invalid JSON** in the summary bar and still shows the valid side when possible.

For valid inputs it runs a **recursive structural diff**:

- **Objects** — Compares by key. Keys only in the left are **Removed**; keys only in the right are **Added**; keys in both are compared recursively.
- **Arrays** — Compares by index. Same index → recursive diff; extra elements in the left are **Removed**; extra in the right are **Added**.
- **Primitives** (string, number, boolean, null) — Same type and equal → **unchanged**; same type but different value → **Changed**; different types (e.g. string vs number) → **TypeChanged**.

Counts (added, removed, changed, unchanged) are derived from this walk. The **Changes** list shows each difference with its path and, for changed/type-changed items, the left and right values.

## Path notation

Every change is reported with a **path** so you can locate it in the JSON:

- **Object keys** — Dot-separated: `user`, `user.name`, `settings.theme`.
- **Array indices** — Brackets: `items[0]`, `items[0].price`, `config.ports[2]`.

Root keys have no leading dot; nested keys use `.`; array elements use `[index]`. This matches common “path” conventions (e.g. JSON Path style) and makes it easy to jump to the same location in both panels.

## Annotated output and line prefixes

The **left** and **right** diff panels show pretty-printed JSON with each line prefixed:

- **Space** — Unchanged (same on both sides)
- **-** — Only in left (removed or left side of a change)
- **+** — Only in right (added or right side of a change)
- **~** — Present in both but value changed

Colours match the summary badges: red for removed, emerald for added, amber for changed. Line numbers are shown on the left for both panels. The backend returns an array of annotated lines (line number, content, annotation) per panel; both panels are padded to the same line count so they stay aligned when scrolling.

## Synchronized scrolling

The left and right diff panels are **synchronized**: scrolling one panel scrolls the other to the same vertical position. This keeps corresponding lines aligned so you can compare structure and values without losing your place. Sync is implemented with scroll event handlers and refs so both panels stay in lockstep.

## Summary bar and Changes list

- **Summary bar** — Shows coloured badges: + added, − removed, ~ changed, and unchanged count. If both sides are identical you see **✓ Identical — no differences found**. Validation errors appear here when left or right JSON is invalid.
- **Changes list** — Collapsible section (collapsed by default) listing every change with path and, for changed/type-changed, old → new value (truncated for long strings).

## Footer actions

- **Copy Left** / **Copy Right** — Copy the current left or right input to the clipboard.
- **Swap** — Swap left and right inputs and re-run the diff immediately.
- **Clear** — Clear both inputs and reset the view.
