//! Cron expression parsing and next-run preview (5-field Unix cron, UTC).

use chrono::Utc;
use cron::Schedule;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CronInput {
    pub expression: String,
    /// How many upcoming run times to return (default 5, max 10).
    pub count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CronOutput {
    pub is_valid: bool,
    pub description: String,
    /// Next N run times as ISO 8601 strings (UTC).
    pub next_runs: Vec<String>,
    pub error: Option<String>,
}

/// The `cron` crate uses **seconds** as the first field, then minute … weekday, with optional year.
/// Common **5-field Unix** cron (`min hour dom month dow`) is normalized by prepending `0` for seconds.
///
/// The cron crate also uses **1-based weekdays** (Sun=1 … Sat=7), while Unix cron uses 0-based
/// (Sun=0 … Sat=6, with 7 also meaning Sunday). We translate the DOW field on normalization.
fn normalized_for_schedule(expr: &str) -> String {
    let t = expr.trim();
    if t.starts_with('@') {
        return t.to_string();
    }
    let parts: Vec<&str> = t.split_whitespace().collect();
    match parts.len() {
        5 => format!(
            "0 {} {} {} {} {}",
            parts[0], parts[1], parts[2], parts[3],
            translate_dow_field(parts[4])
        ),
        _ => t.to_string(),
    }
}

/// Translate a Unix cron DOW token (0-based: 0=Sun … 6=Sat, 7=Sun) to the `cron` crate's
/// 1-based format (1=Sun … 7=Sat). Handles `*`, plain values, ranges, and comma lists.
/// Step expressions (`*/n`) are left unchanged — steps are relative and need no offset.
fn translate_dow_field(field: &str) -> String {
    if field == "*" {
        return "*".to_string();
    }
    // Comma list — translate each element.
    if field.contains(',') {
        return field.split(',')
            .map(|t| translate_dow_field(t.trim()))
            .collect::<Vec<_>>()
            .join(",");
    }
    // Step — leave as-is (e.g. */2 means every 2nd day regardless of base).
    if field.contains('/') {
        return field.to_string();
    }
    // Range a-b — translate both ends.
    if let Some((a, b)) = field.split_once('-') {
        if let (Ok(av), Ok(bv)) = (a.parse::<u8>(), b.parse::<u8>()) {
            return format!("{}-{}", unix_dow_to_cron(av), unix_dow_to_cron(bv));
        }
        return field.to_string();
    }
    // Plain value.
    if let Ok(n) = field.parse::<u8>() {
        return format!("{}", unix_dow_to_cron(n));
    }
    field.to_string()
}

/// Convert a Unix DOW value (0–7, both 0 and 7 = Sunday) to the cron crate's 1-based value.
#[inline]
fn unix_dow_to_cron(n: u8) -> u8 {
    (n % 7) + 1
}

// ---------------------------------------------------------------------------
// Field-level validation — catches out-of-range values the cron crate accepts
// silently (e.g. */75 in the minutes field).
// ---------------------------------------------------------------------------

struct FieldSpec {
    name: &'static str,
    min_val: u8,
    max_val: u8,
}

/// Validate a single cron field token (plain value, `*`, `*/step`, `a/step`,
/// `a-b`, or comma-separated list). Returns `Some(error)` on the first problem.
fn validate_field_token(token: &str, spec: &FieldSpec) -> Option<String> {
    let FieldSpec { name, min_val, max_val } = spec;

    // Wildcard — always valid.
    if token == "*" {
        return None;
    }

    // Comma-separated list — validate each element recursively.
    if token.contains(',') {
        for item in token.split(',') {
            if let Some(err) = validate_field_token(item.trim(), spec) {
                return Some(err);
            }
        }
        return None;
    }

    // Step: `*/n` or `a/n`
    if let Some((base, step_str)) = token.split_once('/') {
        let step: u8 = match step_str.parse() {
            Ok(n) => n,
            Err(_) => {
                return Some(format!(
                    "Invalid step value '{step_str}' in {name} field"
                ))
            }
        };
        if step == 0 {
            return Some(format!("Step value in {name} field must be ≥ 1"));
        }
        if step > *max_val {
            return Some(format!(
                "Step value {step} in {name} field exceeds the valid range (1–{max_val})"
            ));
        }
        // Validate the base part (either `*` or a plain number).
        if base != "*" {
            let base_val: u8 = match base.parse() {
                Ok(n) => n,
                Err(_) => {
                    return Some(format!(
                        "Invalid start value '{base}' in {name} field"
                    ))
                }
            };
            if base_val < *min_val || base_val > *max_val {
                return Some(format!(
                    "Start value {base_val} in {name} field is out of range ({min_val}–{max_val})"
                ));
            }
        }
        return None;
    }

    // Range: `a-b`
    if let Some((a_str, b_str)) = token.split_once('-') {
        let (a, b): (u8, u8) = match (a_str.parse(), b_str.parse()) {
            (Ok(a), Ok(b)) => (a, b),
            _ => {
                return Some(format!(
                    "Invalid range '{token}' in {name} field"
                ))
            }
        };
        if a > b {
            return Some(format!(
                "Range {a}-{b} in {name} field is invalid (start must be ≤ end)"
            ));
        }
        if a < *min_val || b > *max_val {
            return Some(format!(
                "Range {a}-{b} in {name} field is out of range ({min_val}–{max_val})"
            ));
        }
        return None;
    }

    // Plain integer value.
    let n: u8 = match token.parse() {
        Ok(n) => n,
        Err(_) => {
            return Some(format!(
                "Invalid value '{token}' in {name} field"
            ))
        }
    };
    if n < *min_val || n > *max_val {
        return Some(format!(
            "Value {n} in {name} field is out of range ({min_val}–{max_val})"
        ));
    }
    None
}

/// Validate a 5-field Unix cron expression. Returns `Some(error)` on the first
/// invalid field. Shorthands starting with `@` are skipped (validated by cron crate).
fn validate_five_field(expr: &str) -> Option<String> {
    if expr.starts_with('@') {
        return None;
    }
    let parts: Vec<&str> = expr.split_whitespace().collect();
    if parts.len() != 5 {
        return None; // Wrong field count — let the cron crate report this.
    }

    // Field order: min hour dom month dow
    let specs = [
        FieldSpec { name: "minutes",      min_val: 0,  max_val: 59 },
        FieldSpec { name: "hours",        min_val: 0,  max_val: 23 },
        FieldSpec { name: "day-of-month", min_val: 1,  max_val: 31 },
        FieldSpec { name: "month",        min_val: 1,  max_val: 12 },
        FieldSpec { name: "day-of-week",  min_val: 0,  max_val: 7  },
    ];

    for (token, spec) in parts.iter().zip(specs.iter()) {
        if let Some(err) = validate_field_token(token, spec) {
            return Some(err);
        }
    }
    None
}

// ---------------------------------------------------------------------------

pub fn process(input: CronInput) -> CronOutput {
    let expr = input.expression.trim();
    if expr.is_empty() {
        return CronOutput {
            is_valid: false,
            description: String::new(),
            next_runs: vec![],
            error: None,
        };
    }

    // Run field-level validation before the cron crate can silently accept
    // out-of-range values (e.g. */75 in the minutes field).
    if let Some(validation_error) = validate_five_field(expr) {
        return CronOutput {
            is_valid: false,
            description: String::new(),
            next_runs: vec![],
            error: Some(validation_error),
        };
    }

    let count = input.count.unwrap_or(5).min(10).max(1);
    let schedule_src = normalized_for_schedule(expr);

    match Schedule::from_str(&schedule_src) {
        Ok(schedule) => {
            let next_runs: Vec<String> = schedule
                .upcoming(Utc)
                .take(count)
                .map(|dt| dt.to_rfc3339())
                .collect();

            CronOutput {
                is_valid: true,
                description: describe(expr),
                next_runs,
                error: None,
            }
        }
        Err(e) => CronOutput {
            is_valid: false,
            description: String::new(),
            next_runs: vec![],
            error: Some(format!("Invalid cron expression: {e}")),
        },
    }
}

/// Returns the day-of-week name for values 0–7 (0 and 7 = Sunday).
fn weekday_name(dow: &str) -> &'static str {
    match dow {
        "0" | "7" => "Sunday",
        "1"       => "Monday",
        "2"       => "Tuesday",
        "3"       => "Wednesday",
        "4"       => "Thursday",
        "5"       => "Friday",
        "6"       => "Saturday",
        _         => "day",
    }
}

/// Returns an English ordinal string: 1 → "1st", 2 → "2nd", 15 → "15th".
fn ordinal(n: u32) -> String {
    let suffix = match n % 100 {
        11 | 12 | 13 => "th",
        _ => match n % 10 {
            1 => "st",
            2 => "nd",
            3 => "rd",
            _ => "th",
        },
    };
    format!("{n}{suffix}")
}

/// Produce a human-readable description for common cron patterns.
/// Falls back to a generic "Scheduled: <expr>" if not recognised.
fn describe(expr: &str) -> String {
    // Shorthands
    match expr.trim() {
        "@yearly" | "@annually" => return "Once a year (1 January at midnight UTC)".into(),
        "@monthly"              => return "Once a month (1st at midnight UTC)".into(),
        "@weekly"               => return "Once a week (Sunday at midnight UTC)".into(),
        "@daily" | "@midnight"  => return "Every day at midnight (UTC)".into(),
        "@hourly"               => return "Every hour".into(),
        _ => {}
    }

    let parts: Vec<&str> = expr.split_whitespace().collect();
    match parts.as_slice() {
        // ── Wildcards ───────────────────────────────────────────────────────
        ["*", "*", "*", "*", "*"] => "Every minute".into(),
        ["0", "*", "*", "*", "*"] => "Every hour".into(),

        // ── Every N minutes / hours ─────────────────────────────────────────
        [m, "*", "*", "*", "*"] if m.starts_with("*/") => {
            format!("Every {} minutes", &m[2..])
        }
        ["0", h, "*", "*", "*"] if h.starts_with("*/") => {
            format!("Every {} hours", &h[2..])
        }

        // ── Every minute / N minutes during a specific hour ──────────────────
        ["*", hour, "*", "*", "*"] if !hour.starts_with('*') => {
            if let Ok(h) = hour.parse::<u32>() {
                format!("Every minute during hour {h} ({h}:00–{h}:59 UTC)")
            } else {
                format!("Scheduled: {expr}")
            }
        }
        [m, hour, "*", "*", "*"] if m.starts_with("*/") && !hour.starts_with('*') => {
            if let Ok(h) = hour.parse::<u32>() {
                format!("Every {} minutes during hour {h} (UTC)", &m[2..])
            } else {
                format!("Scheduled: {expr}")
            }
        }

        // ── Annual ───────────────────────────────────────────────────────────
        ["0", "0", "1", "1", "*"] => "Once a year on 1 January at midnight (UTC)".into(),
        [min, hour, "1", "1", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("Once a year on 1 January at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }

        // ── Monthly ──────────────────────────────────────────────────────────
        ["0", "0", "1", "*", "*"] => "First day of every month at midnight (UTC)".into(),
        [min, hour, "1", "*", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("First day of every month at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }
        // Nth of every month at midnight: 0 0 D * *
        ["0", "0", dom, "*", "*"] if !dom.starts_with('*') => {
            if let Ok(d) = dom.parse::<u32>() {
                format!("{} of every month at midnight (UTC)", ordinal(d))
            } else {
                format!("Scheduled: {expr}")
            }
        }
        // Nth of every month at H:MM: M H D * *
        [min, hour, dom, "*", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') && !dom.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>(), dom.parse::<u32>()) {
                (Ok(m), Ok(h), Ok(d)) =>
                    format!("{} of every month at {h}:{m:02} UTC", ordinal(d)),
                _ => format!("Scheduled: {expr}"),
            }
        }

        // ── Every day at H:MM ────────────────────────────────────────────────
        ["0", "0", "*", "*", "*"] => "Every day at midnight (UTC)".into(),
        [min, hour, "*", "*", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("Every day at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }

        // ── Weekday shortcuts ────────────────────────────────────────────────
        // Every weekday Mon–Fri: M H * * 1-5
        [min, hour, "*", "*", "1-5"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("Every weekday (Mon–Fri) at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }
        // Specific weekday at midnight: 0 0 * * dow
        ["0", "0", "*", "*", dow]
            if !dow.starts_with('*') && !dow.contains('-') && !dow.contains(',') =>
        {
            format!("Every {} at midnight (UTC)", weekday_name(dow))
        }
        // Specific weekday at H:MM: M H * * dow
        [min, hour, "*", "*", dow]
            if !min.starts_with('*') && !hour.starts_with('*')
            && !dow.starts_with('*') && !dow.contains('-') && !dow.contains(',') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) =>
                    format!("Every {} at {h}:{m:02} UTC", weekday_name(dow)),
                _ => format!("Scheduled: {expr}"),
            }
        }

        _ => format!("Scheduled: {expr}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_five_field_unix() {
        assert_eq!(normalized_for_schedule("* * * * *"), "0 * * * * *");
        assert_eq!(normalized_for_schedule("0 0 * * *"), "0 0 0 * * *");
    }

    #[test]
    fn empty_expression() {
        let out = process(CronInput { expression: "   ".into(), count: None });
        assert!(!out.is_valid);
        assert!(out.next_runs.is_empty());
        assert!(out.error.is_none());
    }

    #[test]
    fn every_minute_valid() {
        let out = process(CronInput { expression: "* * * * *".into(), count: Some(3) });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every minute");
        assert_eq!(out.next_runs.len(), 3);
        assert!(out.error.is_none());
    }

    #[test]
    fn invalid_expression() {
        let out = process(CronInput { expression: "not a cron".into(), count: None });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn midnight_description() {
        let out = process(CronInput { expression: "0 0 * * *".into(), count: Some(1) });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every day at midnight (UTC)");
    }

    #[test]
    fn out_of_range_minute_step_rejected() {
        // */75 in minutes field exceeds max of 59 — must be rejected, not silently accepted.
        let out = process(CronInput { expression: "*/75 0 * * *".into(), count: None });
        assert!(!out.is_valid);
        let err = out.error.expect("expected an error message");
        assert!(err.contains("minutes"), "error should mention the field: {err}");
        assert!(err.contains("75"), "error should mention the bad value: {err}");
    }

    #[test]
    fn out_of_range_hour_rejected() {
        let out = process(CronInput { expression: "0 25 * * *".into(), count: None });
        assert!(!out.is_valid);
        let err = out.error.expect("expected an error message");
        assert!(err.contains("hours"), "error should mention the field: {err}");
    }

    #[test]
    fn valid_step_accepted() {
        // */30 in minutes (30 ≤ 59) is valid.
        let out = process(CronInput { expression: "*/30 * * * *".into(), count: Some(2) });
        assert!(out.is_valid);
        assert_eq!(out.next_runs.len(), 2);
    }

    #[test]
    fn every_hour_description() {
        let out = process(CronInput { expression: "0 * * * *".into(), count: Some(1) });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every hour");
    }

    #[test]
    fn every_n_hours_description() {
        let out = process(CronInput { expression: "0 */6 * * *".into(), count: Some(1) });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every 6 hours");
    }

    #[test]
    fn shorthand_daily() {
        let out = process(CronInput { expression: "@daily".into(), count: Some(1) });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every day at midnight (UTC)");
    }

    #[test]
    fn describe_coverage() {
        let cases = vec![
            // Shorthands
            ("@yearly",        "Once a year"),
            ("@monthly",       "Once a month"),
            ("@weekly",        "Once a week"),
            ("@daily",         "Every day at midnight"),
            ("@hourly",        "Every hour"),
            // Wildcards
            ("* * * * *",      "Every minute"),
            ("0 * * * *",      "Every hour"),
            // Every N minutes/hours
            ("*/5 * * * *",    "Every 5 minutes"),
            ("*/30 * * * *",   "Every 30 minutes"),
            ("0 */2 * * *",    "Every 2 hours"),
            ("0 */6 * * *",    "Every 6 hours"),
            // Every minute / N minutes during hour
            ("* 9 * * *",      "Every minute during hour 9"),
            ("*/15 9 * * *",   "Every 15 minutes during hour 9"),
            // Daily at time
            ("0 0 * * *",      "Every day at midnight"),
            ("0 9 * * *",      "Every day at 9:00 UTC"),
            ("30 9 * * *",     "Every day at 9:30 UTC"),
            // Specific weekday at midnight
            ("0 0 * * 0",      "Every Sunday at midnight"),
            ("0 0 * * 1",      "Every Monday at midnight"),
            ("0 0 * * 5",      "Every Friday at midnight"),
            ("0 0 * * 6",      "Every Saturday at midnight"),
            // Specific weekday at time
            ("0 9 * * 1",      "Every Monday at 9:00 UTC"),
            ("30 8 * * 1",     "Every Monday at 8:30 UTC"),
            ("0 17 * * 5",     "Every Friday at 17:00 UTC"),
            // Weekdays Mon–Fri
            ("0 9 * * 1-5",    "Every weekday (Mon–Fri) at 9:00 UTC"),
            ("30 8 * * 1-5",   "Every weekday (Mon–Fri) at 8:30 UTC"),
            // Monthly
            ("0 0 1 * *",      "First day of every month at midnight"),
            ("0 9 1 * *",      "First day of every month at 9:00 UTC"),
            ("0 0 15 * *",     "15th of every month at midnight"),
            ("0 9 15 * *",     "15th of every month at 9:00 UTC"),
            ("0 0 2 * *",      "2nd of every month at midnight"),
            ("0 0 3 * *",      "3rd of every month at midnight"),
            // Annual
            ("0 0 1 1 *",      "Once a year on 1 January at midnight"),
            ("0 9 1 1 *",      "Once a year on 1 January at 9:00 UTC"),
        ];
        let mut failures = 0;
        for (expr, expected) in &cases {
            let out = process(CronInput { expression: expr.to_string(), count: Some(1) });
            if !out.description.contains(expected) {
                eprintln!("FAIL  {expr:30} → got:      {:?}", out.description);
                eprintln!("                               expected: {:?}", expected);
                failures += 1;
            }
        }
        assert_eq!(failures, 0, "{failures} pattern(s) produced unexpected descriptions");
    }
}
