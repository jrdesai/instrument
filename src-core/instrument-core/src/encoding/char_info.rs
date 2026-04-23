use serde::{Deserialize, Serialize};
use unicode_names2::name;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharLookupInput {
    pub query: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharInfo {
    pub codepoint: u32,
    pub ch: String,
    pub abbr: Option<String>,
    pub name: String,
    pub block: String,
    pub utf8_bytes: Vec<u8>,
    pub hex: String,
    pub js_escape: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharLookupOutput {
    pub matches: Vec<CharInfo>,
    pub error: Option<String>,
}

const C0: [(&str, &str); 32] = [
    ("NUL", "NULL"),
    ("SOH", "START OF HEADING"),
    ("STX", "START OF TEXT"),
    ("ETX", "END OF TEXT"),
    ("EOT", "END OF TRANSMISSION"),
    ("ENQ", "ENQUIRY"),
    ("ACK", "ACKNOWLEDGE"),
    ("BEL", "BELL"),
    ("BS", "BACKSPACE"),
    ("HT", "HORIZONTAL TAB"),
    ("LF", "LINE FEED"),
    ("VT", "VERTICAL TAB"),
    ("FF", "FORM FEED"),
    ("CR", "CARRIAGE RETURN"),
    ("SO", "SHIFT OUT"),
    ("SI", "SHIFT IN"),
    ("DLE", "DATA LINK ESCAPE"),
    ("DC1", "DEVICE CONTROL 1"),
    ("DC2", "DEVICE CONTROL 2"),
    ("DC3", "DEVICE CONTROL 3"),
    ("DC4", "DEVICE CONTROL 4"),
    ("NAK", "NEGATIVE ACKNOWLEDGE"),
    ("SYN", "SYNCHRONOUS IDLE"),
    ("ETB", "END OF TRANSMISSION BLOCK"),
    ("CAN", "CANCEL"),
    ("EM", "END OF MEDIUM"),
    ("SUB", "SUBSTITUTE"),
    ("ESC", "ESCAPE"),
    ("FS", "FILE SEPARATOR"),
    ("GS", "GROUP SEPARATOR"),
    ("RS", "RECORD SEPARATOR"),
    ("US", "UNIT SEPARATOR"),
];

const C1: [(&str, &str); 32] = [
    ("PAD", "PADDING CHARACTER"),
    ("HOP", "HIGH OCTET PRESET"),
    ("BPH", "BREAK PERMITTED HERE"),
    ("NBH", "NO BREAK HERE"),
    ("IND", "INDEX"),
    ("NEL", "NEXT LINE"),
    ("SSA", "START OF SELECTED AREA"),
    ("ESA", "END OF SELECTED AREA"),
    ("HTS", "CHARACTER TABULATION SET"),
    ("HTJ", "CHARACTER TABULATION WITH JUSTIFICATION"),
    ("VTS", "LINE TABULATION SET"),
    ("PLD", "PARTIAL LINE FORWARD"),
    ("PLU", "PARTIAL LINE BACKWARD"),
    ("RI", "REVERSE LINE FEED"),
    ("SS2", "SINGLE SHIFT TWO"),
    ("SS3", "SINGLE SHIFT THREE"),
    ("DCS", "DEVICE CONTROL STRING"),
    ("PU1", "PRIVATE USE ONE"),
    ("PU2", "PRIVATE USE TWO"),
    ("STS", "SET TRANSMIT STATE"),
    ("CCH", "CANCEL CHARACTER"),
    ("MW", "MESSAGE WAITING"),
    ("SPA", "START OF GUARDED AREA"),
    ("EPA", "END OF GUARDED AREA"),
    ("SOS", "START OF STRING"),
    ("SGCI", "SINGLE GRAPHIC CHARACTER INTRODUCER"),
    ("SCI", "SINGLE CHARACTER INTRODUCER"),
    ("CSI", "CONTROL SEQUENCE INTRODUCER"),
    ("ST", "STRING TERMINATOR"),
    ("OSC", "OPERATING SYSTEM COMMAND"),
    ("PM", "PRIVACY MESSAGE"),
    ("APC", "APPLICATION PROGRAM COMMAND"),
];

fn to_js_escape(cp: u32) -> String {
    if cp <= 0xFFFF {
        format!("\\u{cp:04X}")
    } else {
        format!("\\u{{{cp:X}}}")
    }
}

fn to_hex(cp: u32) -> String {
    format!("0x{cp:04X}")
}

fn to_utf8_bytes(cp: u32) -> Vec<u8> {
    let s = char::from_u32(cp).map(|c| c.to_string()).unwrap_or_default();
    s.into_bytes()
}

fn display_char(cp: u32, block: &str) -> String {
    if block == "control" || (128..=159).contains(&cp) {
        String::new()
    } else {
        char::from_u32(cp).map(|c| c.to_string()).unwrap_or_default()
    }
}

fn name_for_cp(cp: u32, fallback: &str) -> String {
    if let Some(ch) = char::from_u32(cp) {
        if let Some(n) = name(ch) {
            return n.to_string().to_uppercase();
        }
    }
    fallback.to_string()
}

fn curated_codepoints() -> Vec<(u32, &'static str)> {
    let mut cps: Vec<(u32, &'static str)> = vec![];
    for cp in 0x2500..=0x257F {
        cps.push((cp, "box-drawing"));
    }
    for cp in 0x2580..=0x259F {
        cps.push((cp, "block-elements"));
    }
    for cp in [
        0x20AC, 0x20BF, 0x20B9, 0x20A3, 0x20A6, 0x20A8, 0x20AD, 0x20BA, 0x20BD, 0xFFE5, 0xFFE1,
        0xFFE0, 0x2200, 0x2202, 0x2203, 0x2205, 0x2207, 0x2208, 0x2209, 0x220B, 0x220F, 0x2211,
        0x2212, 0x2213, 0x2214, 0x2215, 0x2217, 0x2218, 0x221A, 0x221D, 0x221E, 0x221F, 0x2220,
        0x2221, 0x2222, 0x2223, 0x2227, 0x2228, 0x2229, 0x222A, 0x222B, 0x222C, 0x222D, 0x222E,
        0x222F, 0x2230, 0x2248, 0x2249, 0x2260, 0x2261, 0x2262, 0x2264, 0x2265, 0x2266, 0x2267,
        0x226A, 0x226B, 0x2282, 0x2283, 0x2284, 0x2286, 0x2287, 0x2295, 0x2297, 0x2299, 0x22A5,
        0x22C5, 0x22EE, 0x22EF, 0x03C0, 0x03BC, 0x03A3, 0x03A9, 0x03B1, 0x03B2, 0x03B3, 0x03B4,
        0x03B5, 0x03B8, 0x03BB, 0x03C6,
    ] {
        cps.push((cp, "math"));
    }
    for cp in [
        0x2190, 0x2191, 0x2192, 0x2193, 0x2194, 0x2195, 0x2196, 0x2197, 0x2198, 0x2199, 0x21DA,
        0x21DB, 0x219E, 0x21A0, 0x21A3, 0x21A6, 0x21A9, 0x21AA, 0x21AB, 0x21AC, 0x21AD, 0x21AE,
        0x21AF, 0x21B0, 0x21B1, 0x21B2, 0x21B3, 0x21B4, 0x21B5, 0x21B6, 0x21B7, 0x21BA, 0x21BB,
        0x21BC, 0x21BD, 0x21BE, 0x21BF, 0x21C0, 0x21C1, 0x21C2, 0x21C3, 0x21C4, 0x21C5, 0x21C6,
        0x21C7, 0x21C8, 0x21C9, 0x21CA, 0x21CB, 0x21CC, 0x21CD, 0x21CE, 0x21CF, 0x21D0, 0x21D1,
        0x21D2, 0x21D3, 0x21D4, 0x21D5, 0x21D6, 0x21D7, 0x21D8, 0x21D9, 0x27F9, 0x27FA, 0x27F5,
        0x27F6, 0x27F7,
    ] {
        cps.push((cp, "arrows"));
    }
    for cp in [
        0x25A0, 0x25A1, 0x25B2, 0x25BC, 0x25C0, 0x25B6, 0x25C6, 0x25C7, 0x25CB, 0x25CF, 0x25E2,
        0x25E3, 0x25E4, 0x25E5, 0x25EF,
    ] {
        cps.push((cp, "geometric"));
    }
    for cp in [
        0x2600, 0x2601, 0x2602, 0x2603, 0x2605, 0x2606, 0x260E, 0x2611, 0x2612, 0x2615, 0x2620,
        0x2622, 0x2623, 0x262E, 0x262F, 0x2639, 0x263A, 0x2660, 0x2661, 0x2662, 0x2663, 0x2665,
        0x2666, 0x266A, 0x266B, 0x2713, 0x2714, 0x2716, 0x2728, 0x274C, 0x2753, 0x2757, 0x2122,
    ] {
        cps.push((cp, "misc-symbols"));
    }
    for cp in [
        0x1F600, 0x1F603, 0x1F604, 0x1F601, 0x1F606, 0x1F602, 0x1F60D, 0x1F60E, 0x1F62D, 0x1F622,
        0x1F621, 0x1F917, 0x1F44B, 0x1F44D, 0x1F44E, 0x2764, 0x1F49B, 0x1F49A, 0x1F499, 0x1F49C,
        0x1F389, 0x1F680, 0x2705, 0x274C, 0x26A0, 0x1F7E2, 0x1F7E1, 0x1F7E0, 0x1F7E3, 0x2B1B,
        0x2B1C, 0x1F4A0,
    ] {
        cps.push((cp, "emoji"));
    }
    cps
}

fn build_table() -> Vec<CharInfo> {
    let mut out: Vec<CharInfo> = Vec::new();

    for (cp, (abbr, n)) in C0.iter().enumerate() {
        let codepoint = cp as u32;
        out.push(CharInfo {
            codepoint,
            ch: String::new(),
            abbr: Some((*abbr).to_string()),
            name: (*n).to_string(),
            block: "control".to_string(),
            utf8_bytes: vec![],
            hex: to_hex(codepoint),
            js_escape: to_js_escape(codepoint),
        });
    }

    for cp in 32u32..=126u32 {
        out.push(CharInfo {
            codepoint: cp,
            ch: display_char(cp, "ascii-printable"),
            abbr: None,
            name: name_for_cp(cp, "ASCII"),
            block: "ascii-printable".to_string(),
            utf8_bytes: to_utf8_bytes(cp),
            hex: to_hex(cp),
            js_escape: to_js_escape(cp),
        });
    }

    out.push(CharInfo {
        codepoint: 127,
        ch: String::new(),
        abbr: Some("DEL".to_string()),
        name: "DELETE".to_string(),
        block: "control".to_string(),
        utf8_bytes: vec![],
        hex: to_hex(127),
        js_escape: to_js_escape(127),
    });

    for (idx, (abbr, n)) in C1.iter().enumerate() {
        let cp = 128 + idx as u32;
        out.push(CharInfo {
            codepoint: cp,
            ch: String::new(),
            abbr: Some((*abbr).to_string()),
            name: (*n).to_string(),
            block: "latin-supplement".to_string(),
            utf8_bytes: vec![],
            hex: to_hex(cp),
            js_escape: to_js_escape(cp),
        });
    }

    for cp in 160u32..=255u32 {
        out.push(CharInfo {
            codepoint: cp,
            ch: display_char(cp, "latin-supplement"),
            abbr: None,
            name: name_for_cp(cp, "LATIN-1"),
            block: "latin-supplement".to_string(),
            utf8_bytes: to_utf8_bytes(cp),
            hex: to_hex(cp),
            js_escape: to_js_escape(cp),
        });
    }

    for (cp, block) in curated_codepoints() {
        if out.iter().any(|e| e.codepoint == cp) {
            continue;
        }
        out.push(CharInfo {
            codepoint: cp,
            ch: display_char(cp, block),
            abbr: None,
            name: name_for_cp(cp, "UNICODE"),
            block: block.to_string(),
            utf8_bytes: to_utf8_bytes(cp),
            hex: to_hex(cp),
            js_escape: to_js_escape(cp),
        });
    }

    out
}

/// Look up a character by codepoint, character, abbreviation, or name.
pub fn lookup(input: CharLookupInput) -> CharLookupOutput {
    let q = input.query.trim();
    if q.is_empty() {
        return CharLookupOutput {
            matches: vec![],
            error: Some("Query cannot be empty".to_string()),
        };
    }

    let table = build_table();

    let parsed_cp = if q.chars().count() == 1 {
        q.chars().next().map(|c| c as u32)
    } else if q.starts_with("U+") || q.starts_with("u+") {
        u32::from_str_radix(&q[2..], 16).ok()
    } else if q.starts_with("0x") || q.starts_with("0X") {
        u32::from_str_radix(&q[2..], 16).ok()
    } else if q.chars().all(|c| c.is_ascii_digit()) {
        q.parse::<u32>().ok()
    } else {
        None
    };

    if let Some(cp) = parsed_cp {
        let matches = table
            .into_iter()
            .filter(|e| e.codepoint == cp)
            .collect::<Vec<_>>();
        return CharLookupOutput {
            matches,
            error: None,
        };
    }

    let q_lower = q.to_ascii_lowercase();
    let abbr_matches = table
        .iter()
        .filter(|e| {
            e.abbr
                .as_deref()
                .map(|a| a.eq_ignore_ascii_case(&q_lower))
                .unwrap_or(false)
        })
        .cloned()
        .collect::<Vec<_>>();
    if !abbr_matches.is_empty() {
        return CharLookupOutput {
            matches: abbr_matches,
            error: None,
        };
    }

    let name_matches = table
        .into_iter()
        .filter(|e| e.name.to_ascii_lowercase().contains(&q_lower))
        .take(50)
        .collect::<Vec<_>>();

    CharLookupOutput {
        matches: name_matches,
        error: None,
    }
}
