use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum RomanMode {
    ToRoman,
    ToArabic,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RomanInput {
    pub value: String,
    pub mode: RomanMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RomanOutput {
    pub result: String,
    pub steps: Vec<String>,
    pub error: Option<String>,
}

const ROMAN_TABLE: [(&str, u32); 13] = [
    ("M", 1000), ("CM", 900), ("D", 500), ("CD", 400), ("C", 100),
    ("XC", 90), ("L", 50), ("XL", 40), ("X", 10), ("IX", 9), ("V", 5), ("IV", 4), ("I", 1),
];

fn to_roman(mut n: u32) -> (String, Vec<String>) {
    let mut out = String::new();
    let mut steps = Vec::new();
    for (sym, val) in ROMAN_TABLE {
        while n >= val {
            out.push_str(sym);
            steps.push(format!("{sym} ({val})"));
            n -= val;
        }
    }
    (out, steps)
}

fn to_arabic(s: &str) -> Option<(u32, Vec<String>)> {
    let mut remaining = s;
    let mut total = 0u32;
    let mut steps = Vec::new();
    while !remaining.is_empty() {
        let mut matched = false;
        for (sym, val) in ROMAN_TABLE {
            if remaining.starts_with(sym) {
                total += val;
                steps.push(format!("{sym} => {val}"));
                remaining = &remaining[sym.len()..];
                matched = true;
                break;
            }
        }
        if !matched {
            return None;
        }
    }
    Some((total, steps))
}

pub fn process(input: RomanInput) -> RomanOutput {
    let value = input.value.trim().to_uppercase();
    if value.is_empty() {
        return RomanOutput { result: String::new(), steps: vec![], error: Some("Value is required".to_string()) };
    }
    match input.mode {
        RomanMode::ToRoman => {
            let n = match value.parse::<u32>() {
                Ok(v) if (1..=3999).contains(&v) => v,
                _ => return RomanOutput { result: String::new(), steps: vec![], error: Some("Arabic value must be 1..3999".to_string()) },
            };
            let (roman, steps) = to_roman(n);
            RomanOutput { result: roman, steps, error: None }
        }
        RomanMode::ToArabic => {
            let Some((arabic, steps)) = to_arabic(&value) else {
                return RomanOutput { result: String::new(), steps: vec![], error: Some("Invalid Roman numeral".to_string()) };
            };
            RomanOutput { result: arabic.to_string(), steps, error: None }
        }
    }
}
