# Cron Expression Parser & Builder

Parse and validate Unix cron expressions, or build them visually using a form-based generator.

## Tabs

### Parse tab

Enter any 5-field Unix cron expression and see:

- **Valid / Invalid** — instant validation with specific error messages for out-of-range values
- **Description** — plain-English summary of what the schedule does
- **Next 5 runs** — upcoming execution times in UTC

Output updates as you type (150ms debounce). Valid expressions are saved to history (1500ms debounce).

#### Supported syntax

| Syntax | Example | Meaning |
|--------|---------|---------|
| `*` | `*` | Any value |
| Number | `30` | Specific value |
| Step | `*/15` | Every N units |
| Range | `9-17` | From–to (inclusive) |
| List | `1,3,5` | Specific values |

Field order: `minute · hour · day-of-month · month · day-of-week`

Day-of-week uses Unix convention: **0 = Sunday**, 1 = Monday … 6 = Saturday. Both `0` and `7` are accepted for Sunday.

#### Validation

The tool rejects values silently accepted by some parsers, e.g.:
- `*/75 * * * *` → error: step 75 exceeds valid range for minutes (1–59)
- `* * * * 8` → error: day-of-week value 8 exceeds range (0–7)

---

### Build tab

Assemble a cron expression visually using five field selectors. The expression updates live as you change any field.

#### Presets

One-click presets that fill all fields at once:

| Preset | Expression |
|--------|------------|
| Every minute | `* * * * *` |
| Every hour | `0 * * * *` |
| Every day at midnight | `0 0 * * *` |
| Every weekday at 9am | `0 9 * * 1-5` |
| Every Sunday at midnight | `0 0 * * 0` |
| First of every month | `0 0 1 * *` |

#### Field modes

**Minutes (0–59)**

| Mode | Output |
|------|--------|
| Every | `*` |
| At | e.g. `30` |
| Every N | e.g. `*/15` |
| Range | e.g. `0-30` |

**Hours (0–23)**

| Mode | Output |
|------|--------|
| Every | `*` |
| At | e.g. `9` |
| Every N | e.g. `*/6` |
| Range | e.g. `9-17` |

**Day of month (1–31)**

| Mode | Output |
|------|--------|
| Every | `*` |
| On day | e.g. `1` |
| Range | e.g. `1-15` |

**Month (1–12)**

| Mode | Output |
|------|--------|
| Every | `*` |
| In month | e.g. `3` (March) |
| Range | e.g. `3-6` (March–June) |

**Day of week**

| Mode | Output |
|------|--------|
| Every | `*` |
| Specific | e.g. `1,3,5` (Mon, Wed, Fri) |
| Weekdays | `1-5` |
| Weekends | `0,6` |

In Specific mode, toggle individual day pills (Mon–Sun). Selecting all 7 simplifies to `*`.

#### Expression output box

The assembled expression is shown in a monospace box with field labels (`min hr dom mo dow`) aligned beneath each part. A Copy button copies the expression to the clipboard. The same validity, description, and next-runs output as the Parse tab is shown below.

---

## Implementation

- **Rust**: `src-core/instrument-core/src/datetime/cron.rs`
  - `CronInput { expression: String, count: u32 }`
  - `CronOutput { is_valid: bool, description: String, next_runs: Vec<String>, error: Option<String> }`
  - `process()` validates each field, translates Unix DOW to the cron crate's 1-based DOW, then computes next runs using the `cron` crate
- **Frontend**: `src/tools/cron-parser/CronParserTool.tsx`
  - Build tab: pure TypeScript assembly — no additional Rust calls
  - Both tabs call `cron_process` via `callTool()` with `{ skipHistory: true }` at 150ms, history at 1500ms

## Platforms

Desktop and web.
