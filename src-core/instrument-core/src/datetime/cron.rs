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
fn normalized_for_schedule(expr: &str) -> String {
    let t = expr.trim();
    if t.starts_with('@') {
        return t.to_string();
    }
    let parts: Vec<&str> = t.split_whitespace().collect();
    match parts.len() {
        5 => format!(
            "0 {} {} {} {} {}",
            parts[0], parts[1], parts[2], parts[3], parts[4]
        ),
        _ => t.to_string(),
    }
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
        // Common fixed patterns
        ["*", "*", "*", "*", "*"]   => "Every minute".into(),
        ["0", "*", "*", "*", "*"]   => "Every hour".into(),
        ["0", "0", "*", "*", "*"]   => "Every day at midnight (UTC)".into(),
        ["0", "0", "*", "*", "0"]   => "Every Sunday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "1"]   => "Every Monday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "2"]   => "Every Tuesday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "3"]   => "Every Wednesday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "4"]   => "Every Thursday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "5"]   => "Every Friday at midnight (UTC)".into(),
        ["0", "0", "*", "*", "6"]   => "Every Saturday at midnight (UTC)".into(),
        ["0", "0", "1", "*", "*"]   => "First day of every month at midnight (UTC)".into(),
        ["0", "0", "1", "1", "*"]   => "Once a year on 1 January at midnight (UTC)".into(),

        // Every N minutes: */n * * * *
        [m, "*", "*", "*", "*"] if m.starts_with("*/") => {
            let n = &m[2..];
            format!("Every {n} minutes")
        }

        // Every N hours: 0 */n * * *
        ["0", h, "*", "*", "*"] if h.starts_with("*/") => {
            let n = &h[2..];
            format!("Every {n} hours")
        }

        // Every day at H:MM UTC: M H * * *
        [min, hour, "*", "*", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("Every day at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }

        // Every N minutes at a specific hour: */n H * * *
        [m, hour, "*", "*", "*"]
            if m.starts_with("*/") && !hour.starts_with('*') =>
        {
            let n = &m[2..];
            if let Ok(h) = hour.parse::<u32>() {
                format!("Every {n} minutes during hour {h} (UTC)")
            } else {
                format!("Scheduled: {expr}")
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
}
