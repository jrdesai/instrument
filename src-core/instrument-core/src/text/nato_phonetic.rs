//! NATO phonetic alphabet encoder and decoder.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum NatoPhoneticMode {
    Encode,
    Decode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NatoPhoneticInput {
    pub text: String,
    pub mode: NatoPhoneticMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct NatoPhoneticOutput {
    pub result: String,
    pub error: Option<String>,
}

/// NATO/ICAO phonetic alphabet mapping (letter/digit → word).
const NATO: &[(&str, &str)] = &[
    ("A", "Alpha"),
    ("B", "Bravo"),
    ("C", "Charlie"),
    ("D", "Delta"),
    ("E", "Echo"),
    ("F", "Foxtrot"),
    ("G", "Golf"),
    ("H", "Hotel"),
    ("I", "India"),
    ("J", "Juliet"),
    ("K", "Kilo"),
    ("L", "Lima"),
    ("M", "Mike"),
    ("N", "November"),
    ("O", "Oscar"),
    ("P", "Papa"),
    ("Q", "Quebec"),
    ("R", "Romeo"),
    ("S", "Sierra"),
    ("T", "Tango"),
    ("U", "Uniform"),
    ("V", "Victor"),
    ("W", "Whiskey"),
    ("X", "X-ray"),
    ("Y", "Yankee"),
    ("Z", "Zulu"),
    ("0", "Zero"),
    ("1", "One"),
    ("2", "Two"),
    ("3", "Three"),
    ("4", "Four"),
    ("5", "Five"),
    ("6", "Six"),
    ("7", "Seven"),
    ("8", "Eight"),
    ("9", "Niner"),
];

pub fn process(input: NatoPhoneticInput) -> NatoPhoneticOutput {
    if input.text.trim().is_empty() {
        return NatoPhoneticOutput {
            result: String::new(),
            error: None,
        };
    }
    match input.mode {
        NatoPhoneticMode::Encode => encode(&input.text),
        NatoPhoneticMode::Decode => decode(&input.text),
    }
}

fn encode(text: &str) -> NatoPhoneticOutput {
    let lines: Vec<String> = text
        .chars()
        .map(|ch| {
            let upper = ch.to_uppercase().to_string();
            if let Some((_, word)) = NATO.iter().find(|(k, _)| *k == upper.as_str()) {
                format!("{}  →  {}", upper, word)
            } else if ch == ' ' {
                "   →  (space)".to_string()
            } else if ch == '\n' {
                "   →  (newline)".to_string()
            } else if ch == '\t' {
                "   →  (tab)".to_string()
            } else {
                format!("{}  →  {}", ch, ch)
            }
        })
        .collect();
    NatoPhoneticOutput {
        result: lines.join("\n"),
        error: None,
    }
}

fn decode(text: &str) -> NatoPhoneticOutput {
    let tokens: Vec<&str> = text.split_whitespace().collect();
    if tokens.is_empty() {
        return NatoPhoneticOutput {
            result: String::new(),
            error: None,
        };
    }
    let mut result = String::new();
    for token in &tokens {
        let lower = token.to_lowercase();
        if let Some((ch, _)) = NATO.iter().find(|(_, word)| word.to_lowercase() == lower) {
            result.push_str(ch);
        } else if lower == "nine" {
            // Accept both "Nine" and "Niner"
            result.push('9');
        } else {
            result.push('?');
        }
    }
    // If every token was unrecognised, return a helpful error instead of "???..."
    if result.chars().all(|c| c == '?') {
        return NatoPhoneticOutput {
            result: String::new(),
            error: Some(
                "No NATO words recognised. Enter space-separated words, e.g.: Hotel Echo Lima Lima Oscar"
                    .to_string(),
            ),
        };
    }
    NatoPhoneticOutput {
        result,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_hello() {
        let out = process(NatoPhoneticInput {
            text: "Hello".to_string(),
            mode: NatoPhoneticMode::Encode,
        });
        assert!(out.result.contains("Hotel"));
        assert!(out.result.contains("Echo"));
        assert!(out.result.contains("Lima"));
        assert!(out.result.contains("Oscar"));
        assert!(out.error.is_none());
    }

    #[test]
    fn decode_hello() {
        let out = process(NatoPhoneticInput {
            text: "Hotel Echo Lima Lima Oscar".to_string(),
            mode: NatoPhoneticMode::Decode,
        });
        assert_eq!(out.result, "HELLO");
        assert!(out.error.is_none());
    }

    #[test]
    fn encode_digit() {
        let out = process(NatoPhoneticInput {
            text: "9".to_string(),
            mode: NatoPhoneticMode::Encode,
        });
        assert!(out.result.contains("Niner"));
    }

    #[test]
    fn decode_unknown_all_question_marks_gives_error() {
        let out = process(NatoPhoneticInput {
            text: "foo bar baz".to_string(),
            mode: NatoPhoneticMode::Decode,
        });
        assert!(out.error.is_some());
        assert_eq!(out.result, "");
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = process(NatoPhoneticInput {
            text: "  ".to_string(),
            mode: NatoPhoneticMode::Encode,
        });
        assert_eq!(out.result, "");
        assert!(out.error.is_none());
    }
}
