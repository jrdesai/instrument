//! ISO 8601 parsing and formatting: dates, datetimes, week dates, ordinal dates, durations.
//!
//! Parses ISO 8601 strings and returns structured components (date, time, offset,
//! week number, day of year, quarter, day of week) plus conversion formats.

use chrono::{Datelike, DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc, Weekday};
use serde::{Deserialize, Serialize};

/// Input for the ISO 8601 formatter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Iso8601Input {
    /// The ISO 8601 string to parse (date, datetime, week date, ordinal, or duration).
    pub value: String,
}

/// Output: parsed components and conversion formats.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Iso8601Output {
    pub is_valid: bool,
    /// "Date", "DateTime", "DateTime with offset", "DateTime no offset",
    /// "Week date", "Ordinal date", "Duration", "Invalid"
    pub input_type: String,
    pub date: Option<String>,
    pub time: Option<String>,
    pub offset: Option<String>,
    pub utc_equivalent: Option<String>,
    pub week_number: Option<String>,
    pub day_of_year: Option<usize>,
    pub quarter: Option<usize>,
    pub day_of_week: Option<String>,
    pub as_date_only: Option<String>,
    pub as_week_date: Option<String>,
    pub as_ordinal: Option<String>,
    pub as_utc: Option<String>,
    pub as_local_offset: Option<String>,
    pub duration_years: Option<i64>,
    pub duration_months: Option<i64>,
    pub duration_days: Option<i64>,
    pub duration_hours: Option<i64>,
    pub duration_minutes: Option<i64>,
    pub duration_seconds: Option<i64>,
    pub error: Option<String>,
}

fn empty_invalid() -> Iso8601Output {
    Iso8601Output {
        is_valid: false,
        input_type: "Invalid".to_string(),
        date: None,
        time: None,
        offset: None,
        utc_equivalent: None,
        week_number: None,
        day_of_year: None,
        quarter: None,
        day_of_week: None,
        as_date_only: None,
        as_week_date: None,
        as_ordinal: None,
        as_utc: None,
        as_local_offset: None,
        duration_years: None,
        duration_months: None,
        duration_days: None,
        duration_hours: None,
        duration_minutes: None,
        duration_seconds: None,
        error: None,
    }
}

fn err_output(msg: String) -> Iso8601Output {
    Iso8601Output {
        error: Some(msg),
        ..empty_invalid()
    }
}

fn quarter(month: u32) -> usize {
    match month {
        1..=3 => 1,
        4..=6 => 2,
        7..=9 => 3,
        10..=12 => 4,
        _ => 0,
    }
}

/// Parse ISO 8601 duration P[n]Y[n]M[n]DT[n]H[n]M[n]S. Returns (years, months, days, hours, minutes, seconds).
fn parse_duration(s: &str) -> Option<(i64, i64, i64, i64, i64, i64)> {
    let s = s.trim();
    if !s.starts_with('P') {
        return None;
    }
    let s = &s[1..];
    let (date_part, time_part) = if let Some(pos) = s.find('T') {
        (&s[..pos], &s[pos + 1..])
    } else {
        (s, "")
    };

    fn parse_component(s: &str, suffix: char) -> Option<(i64, &str)> {
        let s = s.trim_start();
        let mut digits_end = 0usize;
        for (i, c) in s.char_indices() {
            if c == suffix {
                if i == 0 {
                    return None;
                }
                let n: i64 = s[..i].parse().ok()?;
                return Some((n, s[i + 1..].trim_start()));
            }
            if !c.is_ascii_digit() {
                break;
            }
            digits_end = i + 1;
        }
        if digits_end > 0 && s.chars().nth(digits_end) == Some(suffix) {
            let n: i64 = s[..digits_end].parse().ok()?;
            return Some((n, s[digits_end + 1..].trim_start()));
        }
        None
    }

    let mut y = 0i64;
    let mut m = 0i64;
    let mut d = 0i64;
    let mut rest = date_part;
    while !rest.is_empty() {
        if rest.starts_with('Y') {
            rest = &rest[1..];
            continue;
        }
        if rest.starts_with('M') {
            rest = &rest[1..];
            continue;
        }
        if rest.starts_with('D') {
            rest = &rest[1..];
            continue;
        }
        if let Some((n, r)) = parse_component(rest, 'Y') {
            y = n;
            rest = r;
        } else if let Some((n, r)) = parse_component(rest, 'M') {
            m = n;
            rest = r;
        } else if let Some((n, r)) = parse_component(rest, 'D') {
            d = n;
            rest = r;
        } else {
            break;
        }
    }

    let mut h = 0i64;
    let mut min = 0i64;
    let mut sec = 0i64;
    rest = time_part;
    while !rest.is_empty() {
        if rest.starts_with('H') {
            rest = &rest[1..];
            continue;
        }
        if rest.starts_with('M') {
            rest = &rest[1..];
            continue;
        }
        if rest.starts_with('S') {
            rest = &rest[1..];
            continue;
        }
        if let Some((n, r)) = parse_component(rest, 'H') {
            h = n;
            rest = r;
        } else if let Some((n, r)) = parse_component(rest, 'M') {
            min = n;
            rest = r;
        } else if let Some((n, r)) = parse_component(rest, 'S') {
            sec = n;
            rest = r;
        } else {
            break;
        }
    }

    Some((y, m, d, h, min, sec))
}

fn fill_from_naive_date(
    d: NaiveDate,
    out: &mut Iso8601Output,
) {
    let iso = d.iso_week();
    out.date = Some(d.format("%Y-%m-%d").to_string());
    out.week_number = Some(format!("W{:02}", iso.week()));
    out.day_of_year = Some(d.ordinal() as usize);
    out.quarter = Some(quarter(d.month()));
    out.day_of_week = Some(d.format("%A").to_string());
    out.as_date_only = Some(d.format("%Y-%m-%d").to_string());
    out.as_week_date = Some(format!(
        "{}-W{:02}-{}",
        iso.year(),
        iso.week(),
        d.weekday().num_days_from_monday() + 1
    ));
    out.as_ordinal = Some(format!("{}-{:03}", d.year(), d.ordinal()));
}

fn fill_from_datetime<T: TimeZone>(dt: &DateTime<T>, out: &mut Iso8601Output)
where
    T::Offset: std::fmt::Display,
{
    let date = dt.date_naive();
    fill_from_naive_date(date, out);
    out.time = Some(dt.format("%H:%M:%S").to_string());
    let utc_dt = dt.with_timezone(&Utc);
    out.utc_equivalent = Some(utc_dt.format("%Y-%m-%dT%H:%M:%SZ").to_string());
    out.as_utc = Some(utc_dt.format("%Y-%m-%dT%H:%M:%SZ").to_string());
    out.as_local_offset = Some(dt.format("%Y-%m-%dT%H:%M:%S%:z").to_string());
}

/// Process ISO 8601 input and return structured output.
///
/// # Example
///
/// ```
/// use instrument_core::datetime::iso8601::{process, Iso8601Input};
///
/// let out = process(Iso8601Input { value: "2024-03-04".to_string() });
/// assert!(out.is_valid);
/// assert_eq!(out.input_type, "Date");
/// assert_eq!(out.date.as_deref(), Some("2024-03-04"));
/// ```
pub fn process(input: Iso8601Input) -> Iso8601Output {
    let s = input.value.trim();
    if s.is_empty() {
        return empty_invalid();
    }

    // Duration: P1Y2M3DT4H5M6S
    if s.starts_with('P') {
        if let Some((y, mo, d, h, min, sec)) = parse_duration(s) {
            return Iso8601Output {
                is_valid: true,
                input_type: "Duration".to_string(),
                duration_years: Some(y),
                duration_months: Some(mo),
                duration_days: Some(d),
                duration_hours: Some(h),
                duration_minutes: Some(min),
                duration_seconds: Some(sec),
                ..empty_invalid()
            };
        }
        return err_output("Invalid duration format".to_string());
    }

    // DateTime with Z (UTC)
    if s.ends_with('Z') {
        let trimmed = s.trim_end_matches('Z').trim_end();
        if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S") {
            let utc_dt = naive.and_utc();
            let mut out = empty_invalid();
            out.is_valid = true;
            out.input_type = "DateTime".to_string();
            out.offset = Some("Z".to_string());
            fill_from_datetime(&utc_dt, &mut out);
            return out;
        }
    }

    // DateTime with offset (RFC 3339)
    if s.contains('+') || (s.contains('-') && s.len() > 10 && s.as_bytes().get(10) == Some(&b'T')) {
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            let mut out = empty_invalid();
            out.is_valid = true;
            out.input_type = "DateTime with offset".to_string();
            out.offset = Some(dt.format("%:z").to_string());
            fill_from_datetime(&dt, &mut out);
            return out;
        }
    }

    // DateTime no offset (naive)
    if s.contains('T') && s.len() >= 19 {
        if let Ok(naive) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
            let mut out = empty_invalid();
            out.is_valid = true;
            out.input_type = "DateTime no offset".to_string();
            fill_from_naive_date(naive.date(), &mut out);
            out.time = Some(naive.format("%H:%M:%S").to_string());
            out.utc_equivalent = None; // ambiguous without offset
            out.as_utc = None;
            out.as_local_offset = Some(naive.format("%Y-%m-%dT%H:%M:%S").to_string());
            return out;
        }
    }

    // Week date: 2024-W10 or 2024-W10-1
    if s.contains("-W") {
        let parts: Vec<&str> = s.split('-').collect();
        if parts.len() >= 2 && parts[0].len() == 4 && parts[1].starts_with('W') {
            let year: i32 = match parts[0].parse() {
                Ok(y) => y,
                Err(_) => return err_output("Invalid week date year".to_string()),
            };
            let week_str = parts[1].trim_start_matches('W');
            let week: u32 = match week_str.parse() {
                Ok(w) => w,
                Err(_) => return err_output("Invalid week number".to_string()),
            };
            let day = if parts.len() >= 3 {
                parts[2].parse::<u32>().ok().unwrap_or(1)
            } else {
                1u32
            };
            if !(1..=7).contains(&day) {
                return err_output("Weekday must be 1-7".to_string());
            }
            let weekday = match day {
                1 => Weekday::Mon,
                2 => Weekday::Tue,
                3 => Weekday::Wed,
                4 => Weekday::Thu,
                5 => Weekday::Fri,
                6 => Weekday::Sat,
                7 => Weekday::Sun,
                _ => return err_output("Weekday must be 1-7".to_string()),
            };
            if let Some(date) = NaiveDate::from_isoywd_opt(year, week, weekday) {
                let mut out = empty_invalid();
                out.is_valid = true;
                out.input_type = "Week date".to_string();
                fill_from_naive_date(date, &mut out);
                return out;
            }
            return err_output("Invalid week date".to_string());
        }
    }

    // Ordinal date: 2024-064
    if s.len() >= 8 && s.as_bytes().get(4) == Some(&b'-') {
        let (year_str, ord_str) = s.split_at(4);
        let ord_str = ord_str.trim_start_matches('-');
        if !ord_str.is_empty() && ord_str.len() <= 3 && ord_str.chars().all(|c| c.is_ascii_digit()) {
            let year: i32 = match year_str.parse() {
                Ok(y) => y,
                Err(_) => return err_output("Invalid ordinal year".to_string()),
            };
            let ord: u32 = match ord_str.parse() {
                Ok(o) => o,
                Err(_) => return err_output("Invalid day of year".to_string()),
            };
            if let Some(date) = NaiveDate::from_yo_opt(year, ord) {
                let mut out = empty_invalid();
                out.is_valid = true;
                out.input_type = "Ordinal date".to_string();
                fill_from_naive_date(date, &mut out);
                return out;
            }
            return err_output("Invalid ordinal date".to_string());
        }
    }

    // Date only: 2024-03-04
    if let Ok(date) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        let mut out = empty_invalid();
        out.is_valid = true;
        out.input_type = "Date".to_string();
        fill_from_naive_date(date, &mut out);
        return out;
    }

    err_output("Invalid ISO 8601: no supported format matched".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn date_only() {
        let out = process(Iso8601Input {
            value: "2024-03-04".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "Date");
        assert_eq!(out.date.as_deref(), Some("2024-03-04"));
        assert_eq!(out.week_number.as_deref(), Some("W10"));
        assert_eq!(out.day_of_year, Some(64));
        assert_eq!(out.quarter, Some(1));
        assert_eq!(out.day_of_week.as_deref(), Some("Monday"));
    }

    #[test]
    fn datetime_utc() {
        let out = process(Iso8601Input {
            value: "2024-03-04T12:00:00Z".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "DateTime");
        assert_eq!(out.utc_equivalent.as_deref(), Some("2024-03-04T12:00:00Z"));
        assert_eq!(out.offset.as_deref(), Some("Z"));
    }

    #[test]
    fn datetime_offset() {
        let out = process(Iso8601Input {
            value: "2024-03-04T12:00:00+05:30".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "DateTime with offset");
        assert_eq!(out.offset.as_deref(), Some("+05:30"));
        assert_eq!(out.utc_equivalent.as_deref(), Some("2024-03-04T06:30:00Z"));
    }

    #[test]
    fn week_date() {
        let out = process(Iso8601Input {
            value: "2024-W10".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "Week date");
    }

    #[test]
    fn ordinal() {
        let out = process(Iso8601Input {
            value: "2024-064".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "Ordinal date");
        assert_eq!(out.date.as_deref(), Some("2024-03-04"));
    }

    #[test]
    fn duration() {
        let out = process(Iso8601Input {
            value: "P1Y2M3DT4H5M6S".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.input_type, "Duration");
        assert_eq!(out.duration_years, Some(1));
        assert_eq!(out.duration_months, Some(2));
        assert_eq!(out.duration_days, Some(3));
        assert_eq!(out.duration_hours, Some(4));
        assert_eq!(out.duration_minutes, Some(5));
        assert_eq!(out.duration_seconds, Some(6));
    }

    #[test]
    fn invalid() {
        let out = process(Iso8601Input {
            value: "not-a-date".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn empty() {
        let out = process(Iso8601Input {
            value: "".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_none());
        assert!(out.date.is_none());
    }

    #[test]
    fn quarter_q1() {
        let out = process(Iso8601Input {
            value: "2024-03-15".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.quarter, Some(1));
    }

    #[test]
    fn quarter_q4() {
        let out = process(Iso8601Input {
            value: "2024-11-15".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.quarter, Some(4));
    }

    #[test]
    fn day_of_week() {
        let out = process(Iso8601Input {
            value: "2024-03-04".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.day_of_week.as_deref(), Some("Monday"));
    }
}
