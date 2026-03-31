//! QR code generator returning SVG.

use qrcode::{EcLevel, QrCode};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum QrEcLevel {
    Low,
    Medium,
    Quartile,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct QrCodeInput {
    pub text: String,
    #[serde(default = "default_ec_level")]
    pub ec_level: QrEcLevel,
    /// Size of each module in the SVG.
    #[serde(default = "default_module_size")]
    pub module_size: u32,
    /// Foreground colour as CSS hex string.
    #[serde(default = "default_fg")]
    pub fg_color: String,
    /// Background colour as CSS hex string.
    #[serde(default = "default_bg")]
    pub bg_color: String,
    /// Quiet zone size in modules.
    #[serde(default = "default_margin")]
    pub margin: u32,
}

fn default_ec_level() -> QrEcLevel {
    QrEcLevel::Medium
}

fn default_module_size() -> u32 {
    10
}

fn default_fg() -> String {
    "#000000".to_string()
}

fn default_bg() -> String {
    "#ffffff".to_string()
}

fn default_margin() -> u32 {
    4
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct QrCodeOutput {
    /// Complete SVG string, ready to embed or display.
    pub svg: String,
    /// Side length of the QR code in modules (excluding quiet zone).
    pub size: u32,
    /// QR version number (1-40).
    pub qr_version: u32,
    /// Approximate max byte capacity for current version + EC level.
    pub max_bytes: u32,
    /// Input length in UTF-8 bytes.
    pub input_bytes: u32,
    pub error: Option<String>,
}

pub fn process(input: QrCodeInput) -> QrCodeOutput {
    if input.text.is_empty() {
        return QrCodeOutput {
            svg: String::new(),
            size: 0,
            qr_version: 0,
            max_bytes: 0,
            input_bytes: 0,
            error: None,
        };
    }

    let ec = match input.ec_level {
        QrEcLevel::Low => EcLevel::L,
        QrEcLevel::Medium => EcLevel::M,
        QrEcLevel::Quartile => EcLevel::Q,
        QrEcLevel::High => EcLevel::H,
    };

    let code = match QrCode::with_error_correction_level(input.text.as_bytes(), ec) {
        Ok(c) => c,
        Err(e) => {
            return QrCodeOutput {
                svg: String::new(),
                size: 0,
                qr_version: 0,
                max_bytes: 0,
                input_bytes: input.text.len() as u32,
                error: Some(format!("QR generation failed: {e}")),
            }
        }
    };

    let width = code.width() as u32;
    let module_size = input.module_size.clamp(1, 20);
    let quiet = module_size * input.margin.clamp(0, 10);
    let total = width * module_size + quiet * 2;
    let fg = sanitize_hex_color(&input.fg_color, "#000000");
    let bg = sanitize_hex_color(&input.bg_color, "#ffffff");

    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" width="{total}" height="{total}">"#
    );
    svg.push_str(&format!(r#"<rect width="{total}" height="{total}" fill="{bg}"/>"#));

    for y in 0..width {
        for x in 0..width {
            if code[(x as usize, y as usize)] == qrcode::Color::Dark {
                let px = quiet + x * module_size;
                let py = quiet + y * module_size;
                svg.push_str(&format!(
                    r#"<rect x="{px}" y="{py}" width="{module_size}" height="{module_size}" fill="{fg}"/>"#
                ));
            }
        }
    }

    svg.push_str("</svg>");
    let qr_version = ((width - 21) / 4 + 1).max(1);
    let max_bytes = qr_byte_capacity(qr_version, &input.ec_level);

    QrCodeOutput {
        svg,
        size: width,
        qr_version,
        max_bytes,
        input_bytes: input.text.len() as u32,
        error: None,
    }
}

fn sanitize_hex_color(color: &str, fallback: &str) -> String {
    let c = color.trim();
    if c.starts_with('#')
        && (c.len() == 7 || c.len() == 4)
        && c[1..].chars().all(|ch| ch.is_ascii_hexdigit())
    {
        c.to_string()
    } else {
        fallback.to_string()
    }
}

fn qr_byte_capacity(version: u32, ec: &QrEcLevel) -> u32 {
    let caps_l = [
        17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718,
        792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068,
        2188, 2303, 2431, 2563, 2699, 2809, 2953,
    ];
    let caps_m = [
        14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560,
        624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722,
        1809, 1911, 1989, 2099, 2213, 2331,
    ];
    let caps_q = [
        11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442,
        482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283,
        1351, 1423, 1499, 1579, 1663,
    ];
    let caps_h = [
        7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382,
        403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093,
        1139, 1219, 1273,
    ];

    let idx = (version.saturating_sub(1).min(39)) as usize;
    match ec {
        QrEcLevel::Low => caps_l[idx],
        QrEcLevel::Medium => caps_m[idx],
        QrEcLevel::Quartile => caps_q[idx],
        QrEcLevel::High => caps_h[idx],
    }
}
