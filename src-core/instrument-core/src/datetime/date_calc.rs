use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum DateCalcMode {
    Age,
    Duration,
    AddSubtract,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DateCalcInput {
    pub mode: DateCalcMode,
    pub date_a: String,
    pub date_b: Option<String>,
    pub duration_str: Option<String>,
    pub add: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DateCalcOutput {
    pub result: String,
    pub years: Option<i64>,
    pub months: Option<i64>,
    pub days: Option<i64>,
    pub total_days: Option<i64>,
    pub result_date: Option<String>,
    pub error: Option<String>,
}

fn parse_date(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").map_err(|_| "Expected date format YYYY-MM-DD".to_string())
}

fn parse_iso_duration_days(s: &str) -> Result<i64, String> {
    let mut remaining = s.trim();
    if !remaining.starts_with('P') {
        return Err("Duration must be ISO 8601 style, e.g. P1Y2M3D".to_string());
    }
    remaining = &remaining[1..];
    let mut n = String::new();
    let mut years = 0i64;
    let mut months = 0i64;
    let mut days = 0i64;
    for c in remaining.chars() {
        if c.is_ascii_digit() {
            n.push(c);
            continue;
        }
        if n.is_empty() {
            continue;
        }
        let val = n.parse::<i64>().map_err(|_| "Invalid duration".to_string())?;
        n.clear();
        match c {
            'Y' => years = val,
            'M' => months = val,
            'D' => days = val,
            _ => {}
        }
    }
    Ok(years * 365 + months * 30 + days)
}

fn ymd_diff(a: NaiveDate, b: NaiveDate) -> (i64, i64, i64) {
    let (from, to) = if a <= b { (a, b) } else { (b, a) };
    let mut years = to.year() - from.year();
    let mut months = to.month() as i32 - from.month() as i32;
    let mut days = to.day() as i32 - from.day() as i32;
    if days < 0 {
        months -= 1;
        days += 30;
    }
    if months < 0 {
        years -= 1;
        months += 12;
    }
    (years as i64, months as i64, days as i64)
}

pub fn process(input: DateCalcInput) -> DateCalcOutput {
    let date_a = match parse_date(&input.date_a) {
        Ok(d) => d,
        Err(e) => return DateCalcOutput { result: String::new(), years: None, months: None, days: None, total_days: None, result_date: None, error: Some(e) },
    };
    match input.mode {
        DateCalcMode::Age => {
            let today = chrono::Utc::now().date_naive();
            let (y, m, d) = ymd_diff(date_a, today);
            DateCalcOutput { result: format!("{y} years, {m} months, {d} days"), years: Some(y), months: Some(m), days: Some(d), total_days: Some((today - date_a).num_days().abs()), result_date: None, error: None }
        }
        DateCalcMode::Duration => {
            let date_b = match input.date_b {
                Some(v) => match parse_date(&v) { Ok(d) => d, Err(e) => return DateCalcOutput { result: String::new(), years: None, months: None, days: None, total_days: None, result_date: None, error: Some(e) } },
                None => return DateCalcOutput { result: String::new(), years: None, months: None, days: None, total_days: None, result_date: None, error: Some("Missing date_b (--to)".to_string()) },
            };
            let (y, m, d) = ymd_diff(date_a, date_b);
            DateCalcOutput { result: format!("{y} years, {m} months, {d} days"), years: Some(y), months: Some(m), days: Some(d), total_days: Some((date_b - date_a).num_days().abs()), result_date: None, error: None }
        }
        DateCalcMode::AddSubtract => {
            let duration = match input.duration_str {
                Some(v) => match parse_iso_duration_days(&v) { Ok(days) => days, Err(e) => return DateCalcOutput { result: String::new(), years: None, months: None, days: None, total_days: None, result_date: None, error: Some(e) } },
                None => return DateCalcOutput { result: String::new(), years: None, months: None, days: None, total_days: None, result_date: None, error: Some("Missing --duration".to_string()) },
            };
            let delta = Duration::days(duration);
            let result = if input.add.unwrap_or(true) { date_a + delta } else { date_a - delta };
            DateCalcOutput { result: result.to_string(), years: None, months: None, days: None, total_days: Some(duration), result_date: Some(result.to_string()), error: None }
        }
    }
}
