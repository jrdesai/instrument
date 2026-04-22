use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PercentageInput {
    pub a: f64,
    pub b: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PercentageOutput {
    pub a_pct_of_b: f64,
    pub what_pct_a_of_b: f64,
    pub b_plus_a_pct: f64,
    pub b_minus_a_pct: f64,
    pub pct_change: f64,
    pub ratio: f64,
    pub error: Option<String>,
}

pub fn process(input: PercentageInput) -> PercentageOutput {
    if input.b == 0.0 {
        return PercentageOutput {
            a_pct_of_b: 0.0,
            what_pct_a_of_b: 0.0,
            b_plus_a_pct: 0.0,
            b_minus_a_pct: 0.0,
            pct_change: 0.0,
            ratio: 0.0,
            error: Some("b must not be zero".to_string()),
        };
    }
    let a = input.a;
    let b = input.b;
    PercentageOutput {
        a_pct_of_b: (a / 100.0) * b,
        what_pct_a_of_b: (a / b) * 100.0,
        b_plus_a_pct: b + ((a / 100.0) * b),
        b_minus_a_pct: b - ((a / 100.0) * b),
        pct_change: ((b - a) / a) * 100.0,
        ratio: (a / b) * 100.0,
        error: None,
    }
}
