# Timestamp Converter

Convert between Unix timestamps (seconds or milliseconds) and human-readable date/time formats. Supports "Now" mode for live current time.

## Use cases

- **Debugging / logs**: Paste a Unix timestamp from logs and see the equivalent date and time in UTC and other formats.
- **API work**: Convert API timestamps (e.g. `1709558400`) to readable dates, or paste an ISO date and get the Unix value.
- **Quick reference**: Use Now mode to see the current time in all formats, updating every second.

## Modes

- **To Human**: Enter a Unix timestamp (seconds or milliseconds). Output shows ISO 8601, RFC 2822, UTC human, date-only, time-only, day of week, and relative time (e.g. "2 days ago").
- **To Unix**: Enter a date/time string. The tool parses it and shows the corresponding Unix timestamp plus all human formats.
- **Now**: Ignore input and show the current time in all formats. Output updates every second.

## Supported input formats (To Unix mode)

The tool tries these formats in order:

1. **ISO 8601 with Z**: `2024-03-04T12:00:00Z`
2. **ISO 8601 with offset**: `2024-03-04T12:00:00+00:00`
3. **Space-separated**: `2024-03-04 12:00:00`
4. **Date only**: `2024-03-04` (interpreted as midnight UTC)
5. **RFC 2822**: `Mon, 04 Mar 2024 12:00:00 +0000`

If no format matches, an error is shown.

## Relative time

Relative time is computed against the current time:

- **Past**: "just now", "X seconds ago", "X minutes ago", "X hours ago", "X days ago", "X months ago", "X years ago"
- **Future**: "in X seconds", "in X minutes", etc.

Thresholds: &lt; 10 s → "just now"; &lt; 60 s → seconds; &lt; 1 h → minutes; &lt; 24 h → hours; &lt; 30 days → days; &lt; 365 days → months; else years.

## Output fields

- **Unix (seconds)** / **Unix (milliseconds)**
- **ISO 8601** (e.g. `2024-03-04T12:00:00Z`)
- **RFC 2822** (e.g. `Mon, 04 Mar 2024 12:00:00 +0000`)
- **UTC Human** (e.g. `2024-03-04 12:00:00 UTC`)
- **Date only** / **Time only** / **Day of week**
- **Relative** (e.g. "2 days ago", "in 3 hours", "just now")
- **Is future** (Past / Future badge)

Each card has a Copy button; "Copy All" copies every field as formatted text.
