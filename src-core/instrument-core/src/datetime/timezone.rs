//! Timezone conversion: convert a datetime from one IANA timezone to another.
//!
//! Parses a datetime string (in the "from" timezone), converts to the "to" timezone,
//! and returns the result plus offset/abbreviation/DST info for both zones.

use chrono::{NaiveDate, NaiveDateTime, NaiveTime, Offset, TimeZone, Timelike, Utc};
use chrono_tz::{OffsetComponents, Tz};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use std::str::FromStr;

/// Input for the timezone converter.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TimezoneInput {
    /// Date/time string to convert (interpreted in from_tz).
    pub datetime: String,
    /// IANA timezone for the input, e.g. "America/New_York".
    pub from_tz: String,
    /// IANA timezone for the output, e.g. "Europe/London".
    pub to_tz: String,
}

/// Output of the timezone conversion.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TimezoneOutput {
    /// Converted datetime, e.g. "2024-03-04 07:00:00".
    pub result: String,
    /// ISO 8601 with offset, e.g. "2024-03-04T07:00:00-05:00".
    pub result_iso: String,
    pub from_offset: String,
    pub to_offset: String,
    pub from_abbr: String,
    pub to_abbr: String,
    pub from_dst: bool,
    pub to_dst: bool,
    /// e.g. "+5 hours", "-5 hours", "+5:30 hours", "0 hours (same zone)".
    pub difference: String,
    pub error: Option<String>,
}

fn empty_output(error: String) -> TimezoneOutput {
    TimezoneOutput {
        result: String::new(),
        result_iso: String::new(),
        from_offset: String::new(),
        to_offset: String::new(),
        from_abbr: String::new(),
        to_abbr: String::new(),
        from_dst: false,
        to_dst: false,
        difference: String::new(),
        error: Some(error),
    }
}

/// Format UTC offset as "UTC+5", "UTC-5", or "UTC+5:30".
fn format_offset_seconds(seconds: i32) -> String {
    if seconds == 0 {
        return "UTC+0".to_string();
    }
    let total_minutes = seconds.abs() / 60;
    let hours = total_minutes / 60;
    let mins = total_minutes % 60;
    let sign = if seconds >= 0 { '+' } else { '-' };
    if mins == 0 {
        format!("UTC{}{}", sign, hours)
    } else {
        format!("UTC{}{}:{:02}", sign, hours, mins)
    }
}

/// Parse timezone name to Tz. Returns error message if invalid.
fn parse_tz(name: &str) -> Result<Tz, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Timezone name cannot be empty".to_string());
    }
    Tz::from_str(trimmed).map_err(|_| format!("Unknown timezone: {}", trimmed))
}

/// Try to parse datetime string with several formats. Returns NaiveDateTime.
/// For "time only" (e.g. "12:00:00") uses today's date in from_tz.
fn parse_datetime(s: &str, from_tz: Tz) -> Option<NaiveDateTime> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }

    // 2024-03-04T12:00:00
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S") {
        return Some(naive);
    }
    // 2024-03-04 12:00:00
    if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%d %H:%M:%S") {
        return Some(naive);
    }
    // 2024-03-04 (midnight)
    if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        if let Some(naive) = d.and_hms_opt(0, 0, 0) {
            return Some(naive);
        }
    }
    // 12:00:00 (assume today in from_tz)
    if let Ok(t) = NaiveTime::parse_from_str(trimmed, "%H:%M:%S") {
        let now_in_from = Utc::now().with_timezone(&from_tz);
        let date = now_in_from.date_naive();
        if let Some(naive) = date.and_hms_opt(t.hour(), t.minute(), t.second()) {
            return Some(naive);
        }
    }

    None
}

/// Convert a naive datetime (interpreted in from_tz) to to_tz and build output.
pub fn process(input: TimezoneInput) -> TimezoneOutput {
    let from_tz = match parse_tz(&input.from_tz) {
        Ok(tz) => tz,
        Err(e) => return empty_output(e),
    };
    let to_tz = match parse_tz(&input.to_tz) {
        Ok(tz) => tz,
        Err(e) => return empty_output(e),
    };

    let naive = match parse_datetime(&input.datetime, from_tz) {
        Some(n) => n,
        None => {
            return empty_output("Invalid datetime: no supported format matched".to_string());
        }
    };

    let from_dt = match from_tz.from_local_datetime(&naive).single() {
        Some(dt) => dt,
        None => return empty_output("Ambiguous or invalid local time in from timezone".to_string()),
    };

    let to_dt = from_dt.with_timezone(&to_tz);

    let result = to_dt.format("%Y-%m-%d %H:%M:%S").to_string();
    let result_iso = to_dt.to_rfc3339();

    let from_offset_secs = from_dt.offset().fix().local_minus_utc();
    let to_offset_secs = to_dt.offset().fix().local_minus_utc();

    let from_offset = format_offset_seconds(from_offset_secs);
    let to_offset = format_offset_seconds(to_offset_secs);

    let from_abbr = from_dt.format("%Z").to_string();
    let to_abbr = to_dt.format("%Z").to_string();

    let from_dst = from_dt.offset().dst_offset().num_seconds() != 0;
    let to_dst = to_dt.offset().dst_offset().num_seconds() != 0;

    let diff_secs = to_offset_secs - from_offset_secs;
    let difference = if diff_secs == 0 {
        "0 hours (same zone)".to_string()
    } else {
        let total_minutes = diff_secs.abs() / 60;
        let hours = total_minutes / 60;
        let mins = total_minutes % 60;
        let sign = if diff_secs >= 0 { '+' } else { '-' };
        if mins == 0 {
            format!("{}{} hours", sign, hours)
        } else {
            format!("{}{}:{:02} hours", sign, hours, mins)
        }
    };

    TimezoneOutput {
        result,
        result_iso,
        from_offset,
        to_offset,
        from_abbr,
        to_abbr,
        from_dst,
        to_dst,
        difference,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn utc_to_est() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04 12:00:00".to_string(),
            from_tz: "UTC".to_string(),
            to_tz: "America/New_York".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "2024-03-04 07:00:00");
        assert_eq!(out.difference, "-5 hours");
    }

    #[test]
    fn utc_to_ist() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04 12:00:00".to_string(),
            from_tz: "UTC".to_string(),
            to_tz: "Asia/Kolkata".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "2024-03-04 17:30:00");
        assert!(out.difference.contains("5:30") || out.difference.contains("+5:30"));
    }

    #[test]
    fn same_timezone() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04 12:00:00".to_string(),
            from_tz: "America/New_York".to_string(),
            to_tz: "America/New_York".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "2024-03-04 12:00:00");
        assert_eq!(out.difference, "0 hours (same zone)");
    }

    #[test]
    fn invalid_from_tz() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04 12:00:00".to_string(),
            from_tz: "Invalid/Zone".to_string(),
            to_tz: "UTC".to_string(),
        });
        assert!(out.error.is_some());
        assert!(out.error.unwrap().contains("Unknown timezone"));
    }

    #[test]
    fn invalid_to_tz() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04 12:00:00".to_string(),
            from_tz: "UTC".to_string(),
            to_tz: "Invalid/Zone".to_string(),
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn invalid_datetime() {
        let out = process(TimezoneInput {
            datetime: "not-a-date".to_string(),
            from_tz: "UTC".to_string(),
            to_tz: "America/New_York".to_string(),
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn date_only_input() {
        let out = process(TimezoneInput {
            datetime: "2024-03-04".to_string(),
            from_tz: "UTC".to_string(),
            to_tz: "America/New_York".to_string(),
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "2024-03-03 19:00:00"); // midnight UTC = previous day 19:00 EST
    }

    #[test]
    fn dst_check() {
        // July 2024 - summer in New York, DST active
        let out = process(TimezoneInput {
            datetime: "2024-07-15 12:00:00".to_string(),
            from_tz: "America/New_York".to_string(),
            to_tz: "UTC".to_string(),
        });
        assert!(out.error.is_none());
        assert!(out.from_dst, "July in America/New_York should be DST");
    }

    #[test]
    fn dst_check_winter() {
        // January 2024 - winter in New York, DST inactive
        let out = process(TimezoneInput {
            datetime: "2024-01-15 12:00:00".to_string(),
            from_tz: "America/New_York".to_string(),
            to_tz: "UTC".to_string(),
        });
        assert!(out.error.is_none());
        assert!(!out.from_dst, "January in America/New_York should not be DST");
    }
}
