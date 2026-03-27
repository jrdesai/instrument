//! Color format converter — HEX ↔ RGB ↔ HSL ↔ HSB with CSS named colour lookup.
//!
//! Accepts any of: `#rrggbb`, `#rgb`, `rgb(r,g,b)`, `hsl(h,s%,l%)`,
//! `hsb(h,s%,b%)` / `hsv(...)`, or a CSS named colour such as `cornflowerblue`.
//! Returns all four formats simultaneously.

use serde::{Deserialize, Serialize};

/// Input for the colour converter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorInput {
    pub value: String,
}

/// Output — all four colour formats plus an optional CSS name.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorOutput {
    pub hex: String,
    pub rgb: String,
    pub hsl: String,
    pub hsb: String,
    pub name: Option<String>,
    pub error: Option<String>,
}

// Internal representation (0–255 per channel).
struct Rgb {
    r: u8,
    g: u8,
    b: u8,
}

impl ColorOutput {
    fn empty() -> Self {
        Self {
            hex: String::new(),
            rgb: String::new(),
            hsl: String::new(),
            hsb: String::new(),
            name: None,
            error: None,
        }
    }

    fn from_error(msg: String) -> Self {
        Self {
            hex: String::new(),
            rgb: String::new(),
            hsl: String::new(),
            hsb: String::new(),
            name: None,
            error: Some(msg),
        }
    }
}

/// Convert a colour string to all supported formats.
pub fn process(input: ColorInput) -> ColorOutput {
    let value = input.value.trim().to_string();
    if value.is_empty() {
        return ColorOutput::empty();
    }
    match parse_color(&value) {
        Ok(rgb) => {
            let (h, s, l) = rgb_to_hsl(&rgb);
            let (hb, sb, b) = rgb_to_hsb(&rgb);
            let name = find_css_name(&rgb);
            ColorOutput {
                hex: format!("#{:02x}{:02x}{:02x}", rgb.r, rgb.g, rgb.b),
                rgb: format!("rgb({}, {}, {})", rgb.r, rgb.g, rgb.b),
                hsl: format!("hsl({}, {}%, {}%)", h, s, l),
                hsb: format!("hsb({}, {}%, {}%)", hb, sb, b),
                name,
                error: None,
            }
        }
        Err(e) => ColorOutput::from_error(e),
    }
}

// ── Parsing ───────────────────────────────────────────────────────────────────

fn parse_color(s: &str) -> Result<Rgb, String> {
    let lower = s.trim().to_lowercase();
    if lower.starts_with('#') {
        parse_hex(&lower)
    } else if lower.starts_with("rgb") {
        parse_rgb_str(&lower)
    } else if lower.starts_with("hsl") {
        parse_hsl_str(&lower)
    } else if lower.starts_with("hsb") || lower.starts_with("hsv") {
        parse_hsb_str(&lower)
    } else {
        named_to_rgb(&lower)
            .ok_or_else(|| format!("Unrecognised colour: '{}'. Try #rrggbb, rgb(), hsl(), hsb(), or a CSS colour name.", s))
    }
}

fn parse_hex(s: &str) -> Result<Rgb, String> {
    let hex = s.trim_start_matches('#');
    if hex.chars().any(|c| !c.is_ascii_hexdigit()) {
        return Err(format!("Invalid hex character in '{}'", s));
    }
    let (r, g, b) = match hex.len() {
        3 | 4 => {
            let chars: Vec<char> = hex.chars().collect();
            let r = u8::from_str_radix(&format!("{}{}", chars[0], chars[0]), 16).unwrap();
            let g = u8::from_str_radix(&format!("{}{}", chars[1], chars[1]), 16).unwrap();
            let b = u8::from_str_radix(&format!("{}{}", chars[2], chars[2]), 16).unwrap();
            (r, g, b)
        }
        6 | 8 => {
            // 8-char = RRGGBBAA — ignore alpha
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap();
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap();
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap();
            (r, g, b)
        }
        _ => {
            return Err(format!(
                "Invalid hex colour '{}'. Expected 3 or 6 hex digits after #.",
                s
            ))
        }
    };
    Ok(Rgb { r, g, b })
}

fn parse_rgb_str(s: &str) -> Result<Rgb, String> {
    let inner = extract_parens(s)
        .ok_or_else(|| format!("Invalid rgb() syntax: '{}'", s))?;
    let parts = split_components(inner);
    if parts.len() < 3 {
        return Err(format!("rgb() requires 3 components, got {}", parts.len()));
    }
    Ok(Rgb {
        r: parse_u8_component(parts[0]).map_err(|e| format!("Red: {}", e))?,
        g: parse_u8_component(parts[1]).map_err(|e| format!("Green: {}", e))?,
        b: parse_u8_component(parts[2]).map_err(|e| format!("Blue: {}", e))?,
    })
}

fn parse_hsl_str(s: &str) -> Result<Rgb, String> {
    let inner = extract_parens(s)
        .ok_or_else(|| format!("Invalid hsl() syntax: '{}'", s))?;
    let parts = split_components(inner);
    if parts.len() < 3 {
        return Err("hsl() requires 3 components".to_string());
    }
    let h = parse_hue(parts[0])?;
    let sat = parse_pct(parts[1]).map_err(|e| format!("Saturation: {}", e))?;
    let l = parse_pct(parts[2]).map_err(|e| format!("Lightness: {}", e))?;
    Ok(hsl_to_rgb(h, sat, l))
}

fn parse_hsb_str(s: &str) -> Result<Rgb, String> {
    let inner = extract_parens(s)
        .ok_or_else(|| format!("Invalid hsb() syntax: '{}'", s))?;
    let parts = split_components(inner);
    if parts.len() < 3 {
        return Err("hsb() requires 3 components".to_string());
    }
    let h = parse_hue(parts[0])?;
    let sat = parse_pct(parts[1]).map_err(|e| format!("Saturation: {}", e))?;
    let b = parse_pct(parts[2]).map_err(|e| format!("Brightness: {}", e))?;
    Ok(hsb_to_rgb(h, sat, b))
}

fn extract_parens(s: &str) -> Option<&str> {
    let start = s.find('(')?;
    let end = s.rfind(')')?;
    if end <= start {
        return None;
    }
    Some(&s[start + 1..end])
}

fn split_components(s: &str) -> Vec<&str> {
    s.split([',', '/', ' '])
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect()
}

/// Parse a component that can be 0–255 integer or percentage (0%–100%).
fn parse_u8_component(s: &str) -> Result<u8, String> {
    if s.ends_with('%') {
        let pct: f64 = s
            .trim_end_matches('%')
            .parse()
            .map_err(|_| format!("invalid percentage '{}'", s))?;
        Ok(((pct / 100.0) * 255.0).round().clamp(0.0, 255.0) as u8)
    } else {
        let v: f64 = s
            .parse()
            .map_err(|_| format!("invalid number '{}'", s))?;
        Ok(v.round().clamp(0.0, 255.0) as u8)
    }
}

/// Parse a percentage value (with or without trailing `%`).
fn parse_pct(s: &str) -> Result<f64, String> {
    let stripped = s.trim_end_matches('%');
    let v: f64 = stripped
        .parse()
        .map_err(|_| format!("invalid value '{}'", s))?;
    Ok(v.clamp(0.0, 100.0))
}

/// Parse a hue angle (degrees, optional `deg` suffix).
fn parse_hue(s: &str) -> Result<f64, String> {
    let stripped = s.trim_end_matches("deg");
    let v: f64 = stripped
        .parse()
        .map_err(|_| format!("invalid hue '{}'", s))?;
    Ok(v.rem_euclid(360.0))
}

// ── Conversions ───────────────────────────────────────────────────────────────

/// Returns (hue°, saturation%, lightness%).
fn rgb_to_hsl(rgb: &Rgb) -> (u16, u8, u8) {
    let r = rgb.r as f64 / 255.0;
    let g = rgb.g as f64 / 255.0;
    let b = rgb.b as f64 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    if (max - min).abs() < 1e-10 {
        return (0, 0, (l * 100.0).round() as u8);
    }
    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if (max - r).abs() < 1e-10 {
        (g - b) / d + if g < b { 6.0 } else { 0.0 }
    } else if (max - g).abs() < 1e-10 {
        (b - r) / d + 2.0
    } else {
        (r - g) / d + 4.0
    };
    let h_deg = ((h / 6.0 * 360.0).round() as u16) % 360;
    (h_deg, (s * 100.0).round() as u8, (l * 100.0).round() as u8)
}

/// Returns (hue°, saturation%, brightness%).
fn rgb_to_hsb(rgb: &Rgb) -> (u16, u8, u8) {
    let r = rgb.r as f64 / 255.0;
    let g = rgb.g as f64 / 255.0;
    let b = rgb.b as f64 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    if max < 1e-10 {
        return (0, 0, 0);
    }
    let s = (max - min) / max;
    if (max - min).abs() < 1e-10 {
        return (0, 0, (max * 100.0).round() as u8);
    }
    let d = max - min;
    let h = if (max - r).abs() < 1e-10 {
        (g - b) / d + if g < b { 6.0 } else { 0.0 }
    } else if (max - g).abs() < 1e-10 {
        (b - r) / d + 2.0
    } else {
        (r - g) / d + 4.0
    };
    let h_deg = ((h / 6.0 * 360.0).round() as u16) % 360;
    (h_deg, (s * 100.0).round() as u8, (max * 100.0).round() as u8)
}

fn hsl_to_rgb(h: f64, s: f64, l: f64) -> Rgb {
    let s = s / 100.0;
    let l = l / 100.0;
    if s < 1e-10 {
        let v = (l * 255.0).round() as u8;
        return Rgb { r: v, g: v, b: v };
    }
    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;
    let h_norm = h / 360.0;
    Rgb {
        r: (hue_to_rgb(p, q, h_norm + 1.0 / 3.0) * 255.0).round() as u8,
        g: (hue_to_rgb(p, q, h_norm) * 255.0).round() as u8,
        b: (hue_to_rgb(p, q, h_norm - 1.0 / 3.0) * 255.0).round() as u8,
    }
}

fn hue_to_rgb(p: f64, q: f64, t: f64) -> f64 {
    let t = t.rem_euclid(1.0);
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

fn hsb_to_rgb(h: f64, s: f64, b: f64) -> Rgb {
    let s = s / 100.0;
    let b = b / 100.0;
    if s < 1e-10 {
        let v = (b * 255.0).round() as u8;
        return Rgb { r: v, g: v, b: v };
    }
    let h6 = h / 60.0;
    let i = h6.floor() as u8 % 6;
    let f = h6 - h6.floor();
    let p = b * (1.0 - s);
    let q = b * (1.0 - s * f);
    let t = b * (1.0 - s * (1.0 - f));
    let (r, g, bv) = match i {
        0 => (b, t, p),
        1 => (q, b, p),
        2 => (p, b, t),
        3 => (p, q, b),
        4 => (t, p, b),
        _ => (b, p, q),
    };
    Rgb {
        r: (r * 255.0).round() as u8,
        g: (g * 255.0).round() as u8,
        b: (bv * 255.0).round() as u8,
    }
}

// ── CSS Named Colours ─────────────────────────────────────────────────────────

/// All 148 CSS named colours (name, r, g, b).
static CSS_NAMED_COLORS: &[(&str, u8, u8, u8)] = &[
    ("aliceblue", 240, 248, 255),
    ("antiquewhite", 250, 235, 215),
    ("aqua", 0, 255, 255),
    ("aquamarine", 127, 255, 212),
    ("azure", 240, 255, 255),
    ("beige", 245, 245, 220),
    ("bisque", 255, 228, 196),
    ("black", 0, 0, 0),
    ("blanchedalmond", 255, 235, 205),
    ("blue", 0, 0, 255),
    ("blueviolet", 138, 43, 226),
    ("brown", 165, 42, 42),
    ("burlywood", 222, 184, 135),
    ("cadetblue", 95, 158, 160),
    ("chartreuse", 127, 255, 0),
    ("chocolate", 210, 105, 30),
    ("coral", 255, 127, 80),
    ("cornflowerblue", 100, 149, 237),
    ("cornsilk", 255, 248, 220),
    ("crimson", 220, 20, 60),
    ("cyan", 0, 255, 255),
    ("darkblue", 0, 0, 139),
    ("darkcyan", 0, 139, 139),
    ("darkgoldenrod", 184, 134, 11),
    ("darkgray", 169, 169, 169),
    ("darkgreen", 0, 100, 0),
    ("darkgrey", 169, 169, 169),
    ("darkkhaki", 189, 183, 107),
    ("darkmagenta", 139, 0, 139),
    ("darkolivegreen", 85, 107, 47),
    ("darkorange", 255, 140, 0),
    ("darkorchid", 153, 50, 204),
    ("darkred", 139, 0, 0),
    ("darksalmon", 233, 150, 122),
    ("darkseagreen", 143, 188, 143),
    ("darkslateblue", 72, 61, 139),
    ("darkslategray", 47, 79, 79),
    ("darkslategrey", 47, 79, 79),
    ("darkturquoise", 0, 206, 209),
    ("darkviolet", 148, 0, 211),
    ("deeppink", 255, 20, 147),
    ("deepskyblue", 0, 191, 255),
    ("dimgray", 105, 105, 105),
    ("dimgrey", 105, 105, 105),
    ("dodgerblue", 30, 144, 255),
    ("firebrick", 178, 34, 34),
    ("floralwhite", 255, 250, 240),
    ("forestgreen", 34, 139, 34),
    ("fuchsia", 255, 0, 255),
    ("gainsboro", 220, 220, 220),
    ("ghostwhite", 248, 248, 255),
    ("gold", 255, 215, 0),
    ("goldenrod", 218, 165, 32),
    ("gray", 128, 128, 128),
    ("green", 0, 128, 0),
    ("greenyellow", 173, 255, 47),
    ("grey", 128, 128, 128),
    ("honeydew", 240, 255, 240),
    ("hotpink", 255, 105, 180),
    ("indianred", 205, 92, 92),
    ("indigo", 75, 0, 130),
    ("ivory", 255, 255, 240),
    ("khaki", 240, 230, 140),
    ("lavender", 230, 230, 250),
    ("lavenderblush", 255, 240, 245),
    ("lawngreen", 124, 252, 0),
    ("lemonchiffon", 255, 250, 205),
    ("lightblue", 173, 216, 230),
    ("lightcoral", 240, 128, 128),
    ("lightcyan", 224, 255, 255),
    ("lightgoldenrodyellow", 250, 250, 210),
    ("lightgray", 211, 211, 211),
    ("lightgreen", 144, 238, 144),
    ("lightgrey", 211, 211, 211),
    ("lightpink", 255, 182, 193),
    ("lightsalmon", 255, 160, 122),
    ("lightseagreen", 32, 178, 170),
    ("lightskyblue", 135, 206, 250),
    ("lightslategray", 119, 136, 153),
    ("lightslategrey", 119, 136, 153),
    ("lightsteelblue", 176, 196, 222),
    ("lightyellow", 255, 255, 224),
    ("lime", 0, 255, 0),
    ("limegreen", 50, 205, 50),
    ("linen", 250, 240, 230),
    ("magenta", 255, 0, 255),
    ("maroon", 128, 0, 0),
    ("mediumaquamarine", 102, 205, 170),
    ("mediumblue", 0, 0, 205),
    ("mediumorchid", 186, 85, 211),
    ("mediumpurple", 147, 112, 219),
    ("mediumseagreen", 60, 179, 113),
    ("mediumslateblue", 123, 104, 238),
    ("mediumspringgreen", 0, 250, 154),
    ("mediumturquoise", 72, 209, 204),
    ("mediumvioletred", 199, 21, 133),
    ("midnightblue", 25, 25, 112),
    ("mintcream", 245, 255, 250),
    ("mistyrose", 255, 228, 225),
    ("moccasin", 255, 228, 181),
    ("navajowhite", 255, 222, 173),
    ("navy", 0, 0, 128),
    ("oldlace", 253, 245, 230),
    ("olive", 128, 128, 0),
    ("olivedrab", 107, 142, 35),
    ("orange", 255, 165, 0),
    ("orangered", 255, 69, 0),
    ("orchid", 218, 112, 214),
    ("palegoldenrod", 238, 232, 170),
    ("palegreen", 152, 251, 152),
    ("paleturquoise", 175, 238, 238),
    ("palevioletred", 219, 112, 147),
    ("papayawhip", 255, 239, 213),
    ("peachpuff", 255, 218, 185),
    ("peru", 205, 133, 63),
    ("pink", 255, 192, 203),
    ("plum", 221, 160, 221),
    ("powderblue", 176, 224, 230),
    ("purple", 128, 0, 128),
    ("rebeccapurple", 102, 51, 153),
    ("red", 255, 0, 0),
    ("rosybrown", 188, 143, 143),
    ("royalblue", 65, 105, 225),
    ("saddlebrown", 139, 69, 19),
    ("salmon", 250, 128, 114),
    ("sandybrown", 244, 164, 96),
    ("seagreen", 46, 139, 87),
    ("seashell", 255, 245, 238),
    ("sienna", 160, 82, 45),
    ("silver", 192, 192, 192),
    ("skyblue", 135, 206, 235),
    ("slateblue", 106, 90, 205),
    ("slategray", 112, 128, 144),
    ("slategrey", 112, 128, 144),
    ("snow", 255, 250, 250),
    ("springgreen", 0, 255, 127),
    ("steelblue", 70, 130, 180),
    ("tan", 210, 180, 140),
    ("teal", 0, 128, 128),
    ("thistle", 216, 191, 216),
    ("tomato", 255, 99, 71),
    ("turquoise", 64, 224, 208),
    ("violet", 238, 130, 238),
    ("wheat", 245, 222, 179),
    ("white", 255, 255, 255),
    ("whitesmoke", 245, 245, 245),
    ("yellow", 255, 255, 0),
    ("yellowgreen", 154, 205, 50),
];

fn named_to_rgb(name: &str) -> Option<Rgb> {
    CSS_NAMED_COLORS
        .iter()
        .find(|(n, _, _, _)| *n == name)
        .map(|&(_, r, g, b)| Rgb { r, g, b })
}

fn find_css_name(rgb: &Rgb) -> Option<String> {
    CSS_NAMED_COLORS
        .iter()
        .find(|&&(_, r, g, b)| r == rgb.r && g == rgb.g && b == rgb.b)
        .map(|&(name, _, _, _)| name.to_string())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn run(value: &str) -> ColorOutput {
        process(ColorInput {
            value: value.to_string(),
        })
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = run("");
        assert!(out.error.is_none());
        assert!(out.hex.is_empty());
    }

    #[test]
    fn hex_six_char() {
        let out = run("#ff0000");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
        assert_eq!(out.rgb, "rgb(255, 0, 0)");
        assert_eq!(out.name, Some("red".to_string()));
    }

    #[test]
    fn hex_three_char() {
        let out = run("#f00");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
        assert_eq!(out.name, Some("red".to_string()));
    }

    #[test]
    fn hex_uppercase() {
        let out = run("#FF0000");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
    }

    #[test]
    fn rgb_parse() {
        let out = run("rgb(255, 0, 0)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
        assert_eq!(out.name, Some("red".to_string()));
    }

    #[test]
    fn rgba_ignored_alpha() {
        let out = run("rgba(0, 128, 0, 0.5)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#008000");
        assert_eq!(out.name, Some("green".to_string()));
    }

    #[test]
    fn hsl_parse_red() {
        let out = run("hsl(0, 100%, 50%)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
    }

    #[test]
    fn hsb_parse_red() {
        let out = run("hsb(0, 100%, 100%)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
    }

    #[test]
    fn hsv_alias() {
        let out = run("hsv(0, 100%, 100%)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
    }

    #[test]
    fn named_color() {
        let out = run("cornflowerblue");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#6495ed");
        assert_eq!(out.name, Some("cornflowerblue".to_string()));
    }

    #[test]
    fn named_color_uppercase() {
        let out = run("CornflowerBlue");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#6495ed");
    }

    #[test]
    fn black() {
        let out = run("#000000");
        assert!(out.error.is_none());
        assert_eq!(out.name, Some("black".to_string()));
        assert_eq!(out.hsl, "hsl(0, 0%, 0%)");
        assert_eq!(out.hsb, "hsb(0, 0%, 0%)");
    }

    #[test]
    fn white() {
        let out = run("white");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ffffff");
        assert_eq!(out.hsl, "hsl(0, 0%, 100%)");
    }

    #[test]
    fn invalid_hex_returns_error() {
        let out = run("#gggggg");
        assert!(out.error.is_some());
    }

    #[test]
    fn unknown_name_returns_error() {
        let out = run("notacolor");
        assert!(out.error.is_some());
    }

    #[test]
    fn hsl_round_trip() {
        // #1a2b3c → parse as hex, check hsl output is sane, then parse hsl back
        let from_hex = run("#1a2b3c");
        assert!(from_hex.error.is_none());
        let from_hsl = run(&from_hex.hsl);
        assert!(from_hsl.error.is_none());
        // Allow ±1 rounding difference
        let diff_r = (from_hex.hex.as_bytes()[1] as i16 - from_hsl.hex.as_bytes()[1] as i16).abs();
        assert!(diff_r <= 1, "round-trip rounding error too large");
    }

    #[test]
    fn rgb_percentage_syntax() {
        let out = run("rgb(100%, 0%, 0%)");
        assert!(out.error.is_none());
        assert_eq!(out.hex, "#ff0000");
    }
}
