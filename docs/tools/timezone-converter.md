# Timezone Converter

Convert a date/time from one IANA timezone to another. Shows the result, both offsets, abbreviations, DST status, and the hour difference between the two zones.

## Use cases

- **Scheduling**: "What is 3pm New York time in London?"
- **Logs / APIs**: Interpret timestamps from a known timezone and see the equivalent in another.
- **Travel**: Convert local time to destination time.

## Supported input formats

The datetime string is interpreted in the **From** timezone. The tool tries these formats in order:

1. **ISO-style**: `2024-03-04T12:00:00`
2. **Space-separated**: `2024-03-04 12:00:00`
3. **Date only**: `2024-03-04` (midnight)
4. **Time only**: `12:00:00` (today’s date in the From timezone)

If no format matches, an error is shown.

## IANA timezone names

Use standard IANA timezone names (e.g. `America/New_York`, `Europe/London`, `Asia/Kolkata`). The dropdown lists common zones at the top and supports search over the full list. Invalid names produce a clear error (e.g. "Unknown timezone: America/InvalidCity").

## DST handling

The tool uses the IANA timezone database (via chrono-tz). Offsets and abbreviations reflect whether daylight saving time is active at the given datetime in each zone. The **DST (from)** and **DST (to)** cards show "Active" or "Inactive" for that instant.

## Output fields

- **Result datetime** — Converted time in "YYYY-MM-DD HH:MM:SS" form.
- **ISO 8601** — Result with offset (e.g. `2024-03-04T07:00:00-05:00`).
- **From offset / To offset** — UTC offset (e.g. `UTC-5`, `UTC+5:30`).
- **From abbreviation / To abbreviation** — Zone abbreviation (e.g. EST, IST).
- **DST (from) / DST (to)** — Whether DST is active in that zone at that time.
- **Difference** — Hour difference between the two zones (e.g. `-5 hours`, `+5:30 hours`, `0 hours (same zone)`).

Copy All copies every field as formatted text. Clear resets the datetime input but keeps the current timezone selection.
