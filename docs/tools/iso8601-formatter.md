# ISO 8601 Formatter

Parse and inspect ISO 8601 date, datetime, week date, ordinal date, and duration strings. The tool shows parsed components (date, time, offset, week number, day of year, quarter, day of week), duration breakdown when the input is a duration, and conversion formats (date only, week date, ordinal, UTC, with offset).

## ISO 8601

ISO 8601 is an international standard for date and time representation. It avoids ambiguity (e.g. MM/DD vs DD/MM) and is widely used in APIs, logs, and data exchange.

## Supported input formats

- **Date only:** `2024-03-04`
- **DateTime UTC:** `2024-03-04T12:00:00Z`
- **DateTime with offset:** `2024-03-04T12:00:00+05:30` or `-08:00`
- **DateTime no offset:** `2024-03-04T12:00:00` (naive local)
- **Week date:** `2024-W10` or `2024-W10-1` (ISO week, Monday = 1)
- **Ordinal date:** `2024-064` (day of year)
- **Duration:** `P1Y2M3DT4H5M6S` (see below)

Empty input returns invalid with no error. Unrecognised input returns invalid with a short error message.

## Duration format

Durations use the form `P[n]Y[n]M[n]DT[n]H[n]M[n]S`:

- **P** starts the duration; **T** separates date and time parts.
- **Y** years, **M** months, **D** days, **H** hours, **M** minutes, **S** seconds.
- All components are optional; e.g. `P1Y`, `PT30M`, `P1Y2M3DT4H` are valid.

The tool parses each component and shows them in the Components section. The Conversions section is not shown for duration inputs.

## Use cases

- **Debugging:** Paste an ISO string from logs or an API and see date, time, offset, week, quarter, day of week.
- **Conversions:** Get the same instant as date-only, week date, ordinal, UTC, or with offset.
- **Durations:** Parse and check ISO 8601 durations (e.g. `PT30M` for 30 minutes).
- **Quick reference:** Use the collapsible examples to fill the input and see the parsed result.
