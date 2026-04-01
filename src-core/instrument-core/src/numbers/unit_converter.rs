//! Unit converter for data size, time, temperature, length, weight, speed, angle, and frequency.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum UnitCategory {
    DataSize,
    Time,
    Temperature,
    Length,
    Weight,
    Speed,
    Angle,
    Frequency,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnitConverterInput {
    pub value: f64,
    /// Short unit key, e.g. "km", "mb", "fahrenheit". See unit tables below.
    pub from_unit: String,
    pub category: UnitCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnitResult {
    /// Short key, e.g. "km"
    pub unit: String,
    /// Display label, e.g. "Kilometre (km)"
    pub label: String,
    /// Numeric result
    pub value: f64,
    /// Pre-formatted string with appropriate precision
    pub formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UnitConverterOutput {
    pub results: Vec<UnitResult>,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

pub fn process(input: UnitConverterInput) -> UnitConverterOutput {
    if input.value.is_nan() || input.value.is_infinite() {
        return UnitConverterOutput {
            results: vec![],
            error: Some("Invalid number".to_string()),
        };
    }

    let results = match input.category {
        UnitCategory::DataSize => convert_data_size(input.value, &input.from_unit),
        UnitCategory::Time => convert_time(input.value, &input.from_unit),
        UnitCategory::Temperature => convert_temperature(input.value, &input.from_unit),
        UnitCategory::Length => convert_length(input.value, &input.from_unit),
        UnitCategory::Weight => convert_weight(input.value, &input.from_unit),
        UnitCategory::Speed => convert_speed(input.value, &input.from_unit),
        UnitCategory::Angle => convert_angle(input.value, &input.from_unit),
        UnitCategory::Frequency => convert_frequency(input.value, &input.from_unit),
    };

    match results {
        Ok(r) => UnitConverterOutput { results: r, error: None },
        Err(e) => UnitConverterOutput {
            results: vec![],
            error: Some(e),
        },
    }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

fn fmt(v: f64) -> String {
    if v == 0.0 {
        return "0".to_string();
    }
    let abs = v.abs();
    if abs >= 1e15 || (abs < 1e-6 && abs > 0.0) {
        format!("{v:.6e}")
    } else if abs >= 1.0 {
        let s = format!("{v:.6}");
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    } else {
        let s = format!("{v:.10}");
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    }
}

fn make(unit: &str, label: &str, v: f64) -> UnitResult {
    UnitResult {
        unit: unit.to_string(),
        label: label.to_string(),
        value: v,
        formatted: fmt(v),
    }
}

// ---------------------------------------------------------------------------
// Data Size  (base: bytes)
// ---------------------------------------------------------------------------

fn convert_data_size(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let bytes = match from {
        "bit" => value / 8.0,
        "b" => value,
        "kb" => value * 1_000.0,
        "mb" => value * 1_000_000.0,
        "gb" => value * 1_000_000_000.0,
        "tb" => value * 1_000_000_000_000.0,
        "pb" => value * 1_000_000_000_000_000.0,
        "kib" => value * 1_024.0,
        "mib" => value * 1_048_576.0,
        "gib" => value * 1_073_741_824.0,
        "tib" => value * 1_099_511_627_776.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("bit", "Bit", bytes * 8.0),
        make("b", "Byte (B)", bytes),
        make("kb", "Kilobyte (KB)", bytes / 1_000.0),
        make("mb", "Megabyte (MB)", bytes / 1_000_000.0),
        make("gb", "Gigabyte (GB)", bytes / 1_000_000_000.0),
        make("tb", "Terabyte (TB)", bytes / 1_000_000_000_000.0),
        make("pb", "Petabyte (PB)", bytes / 1_000_000_000_000_000.0),
        make("kib", "Kibibyte (KiB)", bytes / 1_024.0),
        make("mib", "Mebibyte (MiB)", bytes / 1_048_576.0),
        make("gib", "Gibibyte (GiB)", bytes / 1_073_741_824.0),
        make("tib", "Tebibyte (TiB)", bytes / 1_099_511_627_776.0),
    ])
}

// ---------------------------------------------------------------------------
// Time  (base: seconds)
// ---------------------------------------------------------------------------

fn convert_time(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let secs = match from {
        "ns" => value * 1e-9,
        "us" => value * 1e-6,
        "ms" => value * 1e-3,
        "s" => value,
        "min" => value * 60.0,
        "h" => value * 3_600.0,
        "d" => value * 86_400.0,
        "wk" => value * 604_800.0,
        "mo" => value * 2_629_746.0,
        "yr" => value * 31_556_952.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("ns", "Nanosecond (ns)", secs / 1e-9),
        make("us", "Microsecond (μs)", secs / 1e-6),
        make("ms", "Millisecond (ms)", secs / 1e-3),
        make("s", "Second (s)", secs),
        make("min", "Minute (min)", secs / 60.0),
        make("h", "Hour (h)", secs / 3_600.0),
        make("d", "Day (d)", secs / 86_400.0),
        make("wk", "Week (wk)", secs / 604_800.0),
        make("mo", "Month (mo)", secs / 2_629_746.0),
        make("yr", "Year (yr)", secs / 31_556_952.0),
    ])
}

// ---------------------------------------------------------------------------
// Temperature  (special — not multiplicative)
// ---------------------------------------------------------------------------

fn convert_temperature(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let c = match from {
        "c" => value,
        "f" => (value - 32.0) * 5.0 / 9.0,
        "k" => value - 273.15,
        "r" => (value - 491.67) * 5.0 / 9.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("c", "Celsius (°C)", c),
        make("f", "Fahrenheit (°F)", c * 9.0 / 5.0 + 32.0),
        make("k", "Kelvin (K)", c + 273.15),
        make("r", "Rankine (°R)", (c + 273.15) * 9.0 / 5.0),
    ])
}

// ---------------------------------------------------------------------------
// Length  (base: metres)
// ---------------------------------------------------------------------------

fn convert_length(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let m = match from {
        "mm" => value * 1e-3,
        "cm" => value * 1e-2,
        "m" => value,
        "km" => value * 1_000.0,
        "in" => value * 0.0254,
        "ft" => value * 0.3048,
        "yd" => value * 0.9144,
        "mi" => value * 1_609.344,
        "nmi" => value * 1_852.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("mm", "Millimetre (mm)", m / 1e-3),
        make("cm", "Centimetre (cm)", m / 1e-2),
        make("m", "Metre (m)", m),
        make("km", "Kilometre (km)", m / 1_000.0),
        make("in", "Inch (in)", m / 0.0254),
        make("ft", "Foot (ft)", m / 0.3048),
        make("yd", "Yard (yd)", m / 0.9144),
        make("mi", "Mile (mi)", m / 1_609.344),
        make("nmi", "Nautical Mile (nmi)", m / 1_852.0),
    ])
}

// ---------------------------------------------------------------------------
// Weight / Mass  (base: grams)
// ---------------------------------------------------------------------------

fn convert_weight(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let g = match from {
        "mg" => value * 1e-3,
        "g" => value,
        "kg" => value * 1_000.0,
        "t" => value * 1_000_000.0,
        "oz" => value * 28.349_523_125,
        "lb" => value * 453.592_37,
        "st" => value * 6_350.293_18,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("mg", "Milligram (mg)", g / 1e-3),
        make("g", "Gram (g)", g),
        make("kg", "Kilogram (kg)", g / 1_000.0),
        make("t", "Metric Ton (t)", g / 1_000_000.0),
        make("oz", "Ounce (oz)", g / 28.349_523_125),
        make("lb", "Pound (lb)", g / 453.592_37),
        make("st", "Stone (st)", g / 6_350.293_18),
    ])
}

// ---------------------------------------------------------------------------
// Speed  (base: m/s)
// ---------------------------------------------------------------------------

fn convert_speed(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let ms = match from {
        "ms" => value,
        "kmh" => value / 3.6,
        "mph" => value * 0.44704,
        "kn" => value * 0.514_444,
        "fts" => value * 0.3048,
        "mach" => value * 343.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("ms", "Metres/second (m/s)", ms),
        make("kmh", "Kilometres/hour (km/h)", ms * 3.6),
        make("mph", "Miles/hour (mph)", ms / 0.44704),
        make("kn", "Knot (kn)", ms / 0.514_444),
        make("fts", "Feet/second (ft/s)", ms / 0.3048),
        make("mach", "Mach (at sea level)", ms / 343.0),
    ])
}

// ---------------------------------------------------------------------------
// Angle  (base: degrees)
// ---------------------------------------------------------------------------

fn convert_angle(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let deg = match from {
        "deg" => value,
        "rad" => value.to_degrees(),
        "grad" => value * 0.9,
        "turn" => value * 360.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("deg", "Degree (°)", deg),
        make("rad", "Radian (rad)", deg.to_radians()),
        make("grad", "Gradian (grad)", deg / 0.9),
        make("turn", "Turn", deg / 360.0),
    ])
}

// ---------------------------------------------------------------------------
// Frequency  (base: Hz)
// ---------------------------------------------------------------------------

fn convert_frequency(value: f64, from: &str) -> Result<Vec<UnitResult>, String> {
    let hz = match from {
        "hz" => value,
        "khz" => value * 1_000.0,
        "mhz" => value * 1_000_000.0,
        "ghz" => value * 1_000_000_000.0,
        "thz" => value * 1_000_000_000_000.0,
        _ => return Err(format!("Unknown unit: {from}")),
    };
    Ok(vec![
        make("hz", "Hertz (Hz)", hz),
        make("khz", "Kilohertz (kHz)", hz / 1_000.0),
        make("mhz", "Megahertz (MHz)", hz / 1_000_000.0),
        make("ghz", "Gigahertz (GHz)", hz / 1_000_000_000.0),
        make("thz", "Terahertz (THz)", hz / 1_000_000_000_000.0),
    ])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_size_mb_to_bytes() {
        let out = process(UnitConverterInput {
            value: 1.0,
            from_unit: "mb".to_string(),
            category: UnitCategory::DataSize,
        });
        let bytes = out.results.iter().find(|r| r.unit == "b").unwrap();
        assert_eq!(bytes.value, 1_000_000.0);
    }

    #[test]
    fn temperature_boiling_point() {
        let out = process(UnitConverterInput {
            value: 100.0,
            from_unit: "c".to_string(),
            category: UnitCategory::Temperature,
        });
        let f = out.results.iter().find(|r| r.unit == "f").unwrap();
        assert!((f.value - 212.0).abs() < 0.001);
    }

    #[test]
    fn length_one_mile_in_km() {
        let out = process(UnitConverterInput {
            value: 1.0,
            from_unit: "mi".to_string(),
            category: UnitCategory::Length,
        });
        let km = out.results.iter().find(|r| r.unit == "km").unwrap();
        assert!((km.value - 1.609344).abs() < 0.0001);
    }

    #[test]
    fn unknown_unit_returns_error() {
        let out = process(UnitConverterInput {
            value: 1.0,
            from_unit: "xyz".to_string(),
            category: UnitCategory::Length,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn angle_180_deg_is_pi_rad() {
        let out = process(UnitConverterInput {
            value: 180.0,
            from_unit: "deg".to_string(),
            category: UnitCategory::Angle,
        });
        let rad = out.results.iter().find(|r| r.unit == "rad").unwrap();
        assert!((rad.value - std::f64::consts::PI).abs() < 1e-10);
    }

    #[test]
    fn frequency_1_ghz_in_hz() {
        let out = process(UnitConverterInput {
            value: 1.0,
            from_unit: "ghz".to_string(),
            category: UnitCategory::Frequency,
        });
        let hz = out.results.iter().find(|r| r.unit == "hz").unwrap();
        assert_eq!(hz.value, 1_000_000_000.0);
    }
}
