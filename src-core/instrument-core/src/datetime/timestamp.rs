//! Timestamp conversion: Unix ↔ human-readable, and "Now" mode.
//!
//! Converts between Unix timestamps (seconds or milliseconds) and multiple
//! human-readable formats (ISO 8601, RFC 2822, UTC human, date/time only, day of week,
//! and relative time like "2 days ago" / "in 3 hours").

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};

/// Input for the timestamp converter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimestampInput {
    /// The timestamp or date string to convert (ignored when mode is Now).
    pub value: String,
    pub mode: TimestampMode,
    /// Only used when mode is ToHuman: treat value as seconds or milliseconds.
    pub unit: TimestampUnit,
}

/// Conversion direction or "current time".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimestampMode {
    /// Unix timestamp → human-readable formats.
    ToHuman,
    /// Date string → Unix timestamp.
    ToUnix,
    /// Use current time; value is ignored.
    Now,
}

/// Unit for ToHuman mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimestampUnit {
    Seconds,
    Milliseconds,
}

/// Output: all formats for the resolved instant.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimestampOutput {
    pub unix_seconds: i64,
    pub unix_milliseconds: i64,
    /// e.g. 2024-03-04T12:00:00Z
    pub iso_8601: String,
    /// e.g. Mon, 04 Mar 2024 12:00:00 +0000
    pub rfc_2822: String,
    /// e.g. 2024-03-04 12:00:00 UTC
    pub utc_human: String,
    /// e.g. 2024-03-04
    pub date_only: String,
    /// e.g. 12:00:00
    pub time_only: String,
    /// e.g. Monday
    pub day_of_week: String,
    /// e.g. "2 days ago", "in 3 hours", "just now"
    pub relative: String,
    pub is_future: bool,
    pub error: Option<String>,
}

fn format_all(dt: DateTime<Utc>) -> (String, String, String, String, String, String) {
    let iso_8601 = dt.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let rfc_2822 = dt.format("%a, %d %b %Y %H:%M:%S %z").to_string();
    let utc_human = format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S"));
    let date_only = dt.format("%Y-%m-%d").to_string();
    let time_only = dt.format("%H:%M:%S").to_string();
    let day_of_week = dt.format("%A").to_string();
    (iso_8601, rfc_2822, utc_human, date_only, time_only, day_of_week)
}

fn relative_string(dt: DateTime<Utc>, now: DateTime<Utc>) -> (String, bool) {
    let delta = dt.signed_duration_since(now);
    let is_future = delta.num_seconds() > 0;
    let secs = delta.num_seconds().abs();

    let (value, unit, past) = if secs < 10 {
        (0, "just now", true)
    } else if secs < 60 {
        (secs as i64, "seconds", delta.num_seconds() < 0)
    } else if secs < 3600 {
        (secs / 60, "minutes", delta.num_seconds() < 0)
    } else if secs < 86400 {
        (secs / 3600, "hours", delta.num_seconds() < 0)
    } else if secs < 2_592_000 {
        (secs / 86400, "days", delta.num_seconds() < 0)
    } else if secs < 31_536_000 {
        (secs / 2_592_000, "months", delta.num_seconds() < 0)
    } else {
        (secs / 31_536_000, "years", delta.num_seconds() < 0)
    };

    let rel = if unit == "just now" {
        "just now".to_string()
    } else if past {
        format!("{} {} ago", value, unit)
    } else {
        format!("in {} {}", value, unit)
    };

    (rel, is_future)
}

fn empty_output(error: Option<String>) -> TimestampOutput {
    TimestampOutput {
        unix_seconds: 0,
        unix_milliseconds: 0,
        iso_8601: String::new(),
        rfc_2822: String::new(),
        utc_human: String::new(),
        date_only: String::new(),
        time_only: String::new(),
        day_of_week: String::new(),
        relative: String::new(),
        is_future: false,
        error,
    }
}

fn output_from_dt(dt: DateTime<Utc>) -> TimestampOutput {
    let now = Utc::now();
    let (iso_8601, rfc_2822, utc_human, date_only, time_only, day_of_week) = format_all(dt);
    let (relative, is_future) = relative_string(dt, now);
    let unix_seconds = dt.timestamp();
    let unix_milliseconds = dt.timestamp_millis();

    TimestampOutput {
        unix_seconds,
        unix_milliseconds,
        iso_8601,
        rfc_2822,
        utc_human,
        date_only,
        time_only,
        day_of_week,
        relative,
        is_future,
        error: None,
    }
}

/// Parses a date string using supported formats (ISO 8601 with Z or offset,
/// space-separated datetime, date-only, RFC 2822). Returns None if no format matches.
fn parse_date_string(value: &str) -> Option<DateTime<Utc>> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    // ISO 8601 with Z — parse as naive then attach UTC to avoid timezone interpretation
    if trimmed.ends_with('Z') {
        let s = trimmed.trim_end_matches('Z').trim_end();
        if let Ok(naive) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
            return Some(naive.and_utc());
        }
    }

    // ISO 8601 with +00:00 etc
    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }

    // Space-separated: 2024-03-04 12:00:00
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S") {
        return Some(naive.and_utc());
    }

    // Date only: 2024-03-04 (midnight UTC)
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        if let Some(naive) = d.and_hms_opt(0, 0, 0) {
            return Some(naive.and_utc());
        }
    }

    // RFC 2822
    if let Ok(dt) = DateTime::parse_from_rfc2822(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }

    None
}

/// Converts timestamp input to all output formats.
///
/// # Example
///
/// ```
/// use instrument_core::datetime::timestamp::{process, TimestampInput, TimestampMode, TimestampUnit};
///
/// let out = process(TimestampInput {
///     value: "0".to_string(),
///     mode: TimestampMode::ToHuman,
///     unit: TimestampUnit::Seconds,
/// });
/// assert_eq!(out.iso_8601, "1970-01-01T00:00:00Z");
/// assert!(!out.is_future);
/// ```
pub fn process(input: TimestampInput) -> TimestampOutput {
    let now = Utc::now();

    match input.mode {
        TimestampMode::Now => return output_from_dt(now),
        TimestampMode::ToHuman => {
            let value = input.value.trim();
            if value.is_empty() {
                return empty_output(Some("Empty timestamp".to_string()));
            }
            let n: i64 = match value.parse() {
                Ok(x) => x,
                Err(_) => return empty_output(Some("Invalid timestamp: not a number".to_string())),
            };
            let seconds = match input.unit {
                TimestampUnit::Seconds => n,
                TimestampUnit::Milliseconds => n / 1000,
            };
            match DateTime::from_timestamp(seconds, 0) {
                Some(dt) => output_from_dt(dt),
                None => empty_output(Some("Invalid timestamp: out of range".to_string())),
            }
        }
        TimestampMode::ToUnix => {
            let value = input.value.trim();
            if value.is_empty() {
                return empty_output(Some("Empty date string".to_string()));
            }
            match parse_date_string(value) {
                Some(dt) => output_from_dt(dt),
                None => empty_output(Some("Invalid date: no supported format matched".to_string())),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_timestamp() {
        let out = process(TimestampInput {
            value: "0".to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert_eq!(out.iso_8601, "1970-01-01T00:00:00Z");
        assert_eq!(out.unix_seconds, 0);
        assert!(!out.is_future);
    }

    #[test]
    fn to_human_seconds() {
        let out = process(TimestampInput {
            value: "1709558400".to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert_eq!(out.unix_seconds, 1709558400);
        assert!(out.error.is_none());
        // Round-trip: formatted ISO parses back to same timestamp
        assert!(parse_date_string(&out.iso_8601).map(|dt| dt.timestamp()) == Some(1709558400));
    }

    #[test]
    fn to_human_milliseconds() {
        let out = process(TimestampInput {
            value: "1709558400000".to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Milliseconds,
        });
        assert_eq!(out.unix_seconds, 1709558400);
        assert!(out.error.is_none());
        assert!(parse_date_string(&out.iso_8601).map(|dt| dt.timestamp()) == Some(1709558400));
    }

    #[test]
    fn to_unix_iso() {
        let out = process(TimestampInput {
            value: "2024-03-04T12:00:00Z".to_string(),
            mode: TimestampMode::ToUnix,
            unit: TimestampUnit::Seconds,
        });
        assert!(out.error.is_none());
        // 2024-03-04 00:00 UTC = 1709510400, 2024-03-05 00:00 UTC = 1709596800
        assert!(
            out.unix_seconds >= 1709510400 && out.unix_seconds < 1709596800,
            "unix_seconds {} should be on 2024-03-04",
            out.unix_seconds
        );
        // Round-trip: ToHuman with this timestamp yields same ISO
        let out2 = process(TimestampInput {
            value: out.unix_seconds.to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert_eq!(out2.iso_8601, out.iso_8601);
    }

    #[test]
    fn to_unix_date_only() {
        let out = process(TimestampInput {
            value: "2024-03-04".to_string(),
            mode: TimestampMode::ToUnix,
            unit: TimestampUnit::Seconds,
        });
        assert_eq!(out.unix_seconds, 1709510400); // midnight UTC that day
        assert_eq!(out.iso_8601, "2024-03-04T00:00:00Z");
    }

    #[test]
    fn now_mode() {
        let before = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let out = process(TimestampInput {
            value: "".to_string(),
            mode: TimestampMode::Now,
            unit: TimestampUnit::Seconds,
        });
        let after = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        assert!(out.unix_seconds >= before - 5 && out.unix_seconds <= after + 5);
        assert!(!out.is_future);
    }

    #[test]
    fn invalid_timestamp() {
        let out = process(TimestampInput {
            value: "notanumber".to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert!(out.error.is_some());
        assert_eq!(out.iso_8601, "");
    }

    #[test]
    fn invalid_date() {
        let out = process(TimestampInput {
            value: "not-a-date".to_string(),
            mode: TimestampMode::ToUnix,
            unit: TimestampUnit::Seconds,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn future_timestamp() {
        let out = process(TimestampInput {
            value: "4000000000".to_string(), // 2096
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert!(out.is_future);
    }

    #[test]
    fn past_timestamp() {
        let out = process(TimestampInput {
            value: "0".to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert!(!out.is_future);
    }

    #[test]
    fn relative_past() {
        let now = Utc::now();
        let one_hour_ago = now - chrono::Duration::hours(1);
        let out = process(TimestampInput {
            value: one_hour_ago.timestamp().to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert_eq!(out.relative, "1 hours ago");
        assert!(!out.is_future);
    }

    #[test]
    fn relative_future() {
        let now = Utc::now();
        let one_hour_later = now + chrono::Duration::hours(1);
        let out = process(TimestampInput {
            value: one_hour_later.timestamp().to_string(),
            mode: TimestampMode::ToHuman,
            unit: TimestampUnit::Seconds,
        });
        assert!(out.relative.starts_with("in "));
        assert!(
            out.relative.contains("hours") || out.relative.contains("minutes"),
            "expected 'in X hours' or 'in X minutes', got {}",
            out.relative
        );
        assert!(out.is_future);
    }
}
