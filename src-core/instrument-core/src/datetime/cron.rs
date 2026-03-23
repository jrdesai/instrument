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
/// Falls back to the raw expression if not recognised.
fn describe(expr: &str) -> String {
    let parts: Vec<&str> = expr.split_whitespace().collect();
    match parts.as_slice() {
        ["0", "0", "*", "*", "*"] => "Every day at midnight (UTC)".into(),
        ["0", "0", "*", "*", "0"] => "Every Sunday at midnight (UTC)".into(),
        ["0", "0", "1", "*", "*"] => "First day of every month at midnight (UTC)".into(),
        [min, "0", "*", "*", "*"] if !min.starts_with('*') => {
            if let Ok(m) = min.parse::<u32>() {
                format!("Every day at 00:{m:02} UTC")
            } else {
                format!("Scheduled: {expr}")
            }
        }
        [min, hour, "*", "*", "*"]
            if !min.starts_with('*') && !hour.starts_with('*') =>
        {
            match (min.parse::<u32>(), hour.parse::<u32>()) {
                (Ok(m), Ok(h)) => format!("Every day at {h}:{m:02} UTC"),
                _ => format!("Scheduled: {expr}"),
            }
        }
        ["*", "*", "*", "*", "*"] => "Every minute".into(),
        [m, "*", "*", "*", "*"] if m.starts_with("*/") => {
            let n = &m[2..];
            format!("Every {n} minutes")
        }
        _ => format!("Scheduled: {expr}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_five_field_unix() {
        assert_eq!(
            normalized_for_schedule("* * * * *"),
            "0 * * * * *"
        );
        assert_eq!(
            normalized_for_schedule("0 0 * * *"),
            "0 0 0 * * *"
        );
    }

    #[test]
    fn empty_expression() {
        let out = process(CronInput {
            expression: "   ".into(),
            count: None,
        });
        assert!(!out.is_valid);
        assert!(out.next_runs.is_empty());
        assert!(out.error.is_none());
    }

    #[test]
    fn every_minute_valid() {
        let out = process(CronInput {
            expression: "* * * * *".into(),
            count: Some(3),
        });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every minute");
        assert_eq!(out.next_runs.len(), 3);
        assert!(out.error.is_none());
    }

    #[test]
    fn invalid_expression() {
        let out = process(CronInput {
            expression: "not a cron".into(),
            count: None,
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn midnight_description() {
        let out = process(CronInput {
            expression: "0 0 * * *".into(),
            count: Some(1),
        });
        assert!(out.is_valid);
        assert_eq!(out.description, "Every day at midnight (UTC)");
    }
}
