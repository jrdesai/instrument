//! WCAG 2.1 colour contrast checker.
//!
//! Parses hex colours, computes relative luminance per W3C, and reports the
//! contrast ratio + all four WCAG pass/fail levels.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

// ── Input / Output ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ColorContrastInput {
    /// Foreground colour — 3 or 6-digit hex, with or without `#`.
    pub foreground: String,
    /// Background colour — 3 or 6-digit hex, with or without `#`.
    pub background: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ColorContrastOutput {
    /// Contrast ratio, e.g. 4.54.
    pub ratio: f64,
    /// Human-readable ratio string, e.g. "4.54:1".
    pub ratio_display: String,
    /// WCAG AA — normal text (≥4.5:1).
    pub aa_normal: bool,
    /// WCAG AA — large text / UI components (≥3.0:1).
    pub aa_large: bool,
    /// WCAG AAA — normal text (≥7.0:1).
    pub aaa_normal: bool,
    /// WCAG AAA — large text (≥4.5:1).
    pub aaa_large: bool,
    /// Normalised foreground hex (always `#RRGGBB` uppercase).
    pub foreground_hex: String,
    /// Normalised background hex (always `#RRGGBB` uppercase).
    pub background_hex: String,
    /// Set when either colour cannot be parsed.
    pub error: Option<String>,
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn process(input: ColorContrastInput) -> ColorContrastOutput {
    let fg = match parse_hex(&input.foreground) {
        Ok(c) => c,
        Err(e) => return error_output(e),
    };
    let bg = match parse_hex(&input.background) {
        Ok(c) => c,
        Err(e) => return error_output(e),
    };

    let l_fg = relative_luminance(fg);
    let l_bg = relative_luminance(bg);

    let (lighter, darker) = if l_fg > l_bg {
        (l_fg, l_bg)
    } else {
        (l_bg, l_fg)
    };

    let ratio = (lighter + 0.05) / (darker + 0.05);
    // Round to 2 decimal places for display.
    let ratio_rounded = (ratio * 100.0).round() / 100.0;

    ColorContrastOutput {
        ratio: ratio_rounded,
        ratio_display: format!("{:.2}:1", ratio_rounded),
        aa_normal: ratio >= 4.5,
        aa_large: ratio >= 3.0,
        aaa_normal: ratio >= 7.0,
        aaa_large: ratio >= 4.5,
        foreground_hex: format_hex(fg),
        background_hex: format_hex(bg),
        error: None,
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Rgb = (u8, u8, u8);

/// Parse a 3- or 6-digit hex colour string (with or without `#`) into `(r, g, b)`.
fn parse_hex(raw: &str) -> Result<Rgb, String> {
    let s = raw.trim().trim_start_matches('#');
    let expanded: String = if s.len() == 3 {
        s.chars().flat_map(|c| [c, c]).collect()
    } else {
        s.to_string()
    };
    if expanded.len() != 6 {
        return Err(format!(
            "Invalid colour \"{}\": expected 3 or 6 hex digits",
            raw.trim()
        ));
    }
    let r = u8::from_str_radix(&expanded[0..2], 16)
        .map_err(|_| format!("Invalid colour \"{}\"", raw.trim()))?;
    let g = u8::from_str_radix(&expanded[2..4], 16)
        .map_err(|_| format!("Invalid colour \"{}\"", raw.trim()))?;
    let b = u8::from_str_radix(&expanded[4..6], 16)
        .map_err(|_| format!("Invalid colour \"{}\"", raw.trim()))?;
    Ok((r, g, b))
}

/// W3C WCAG 2.1 relative luminance formula.
fn relative_luminance((r, g, b): Rgb) -> f64 {
    let linearise = |c: u8| -> f64 {
        let s = c as f64 / 255.0;
        if s <= 0.04045 {
            s / 12.92
        } else {
            ((s + 0.055) / 1.055_f64).powf(2.4)
        }
    };
    0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
}

fn format_hex((r, g, b): Rgb) -> String {
    format!("#{:02X}{:02X}{:02X}", r, g, b)
}

fn error_output(msg: String) -> ColorContrastOutput {
    ColorContrastOutput {
        ratio: 0.0,
        ratio_display: "—".to_string(),
        aa_normal: false,
        aa_large: false,
        aaa_normal: false,
        aaa_large: false,
        foreground_hex: String::new(),
        background_hex: String::new(),
        error: Some(msg),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn check(fg: &str, bg: &str) -> ColorContrastOutput {
        process(ColorContrastInput {
            foreground: fg.to_string(),
            background: bg.to_string(),
        })
    }

    #[test]
    fn black_on_white_is_21() {
        let r = check("#000000", "#FFFFFF");
        assert!(r.error.is_none());
        assert_eq!(r.ratio, 21.0);
        assert!(r.aa_normal && r.aa_large && r.aaa_normal && r.aaa_large);
    }

    #[test]
    fn white_on_white_is_1() {
        let r = check("#FFFFFF", "#FFFFFF");
        assert!(r.error.is_none());
        assert_eq!(r.ratio, 1.0);
        assert!(!r.aa_normal && !r.aa_large && !r.aaa_normal && !r.aaa_large);
    }

    #[test]
    fn shorthand_hex_expands_correctly() {
        let r = check("#000", "#fff");
        assert!(r.error.is_none());
        assert_eq!(r.ratio, 21.0);
    }

    #[test]
    fn no_hash_prefix_works() {
        let r = check("000000", "ffffff");
        assert!(r.error.is_none());
        assert_eq!(r.ratio, 21.0);
    }

    #[test]
    fn invalid_hex_returns_error() {
        let r = check("#ZZZZZZ", "#FFFFFF");
        assert!(r.error.is_some());
    }

    #[test]
    fn aa_pass_aaa_fail_range() {
        // #767676 on white ≈ 4.54:1 — passes AA normal, fails AAA normal
        let r = check("#767676", "#FFFFFF");
        assert!(r.error.is_none());
        assert!(r.aa_normal);
        assert!(!r.aaa_normal);
    }
}
