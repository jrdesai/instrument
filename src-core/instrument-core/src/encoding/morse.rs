use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum MorseMode {
    Encode,
    Decode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MorseInput {
    pub text: String,
    pub mode: MorseMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MorseOutput {
    pub result: String,
    pub error: Option<String>,
}

const MORSE_PAIRS: [(&str, &str); 36] = [
    ("A", ".-"), ("B", "-..."), ("C", "-.-."), ("D", "-.."), ("E", "."), ("F", "..-."),
    ("G", "--."), ("H", "...."), ("I", ".."), ("J", ".---"), ("K", "-.-"), ("L", ".-.."),
    ("M", "--"), ("N", "-."), ("O", "---"), ("P", ".--."), ("Q", "--.-"), ("R", ".-."),
    ("S", "..."), ("T", "-"), ("U", "..-"), ("V", "...-"), ("W", ".--"), ("X", "-..-"),
    ("Y", "-.--"), ("Z", "--.."), ("0", "-----"), ("1", ".----"), ("2", "..---"),
    ("3", "...--"), ("4", "....-"), ("5", "....."), ("6", "-...."), ("7", "--..."),
    ("8", "---.."), ("9", "----."),
];

fn encode_char(c: char) -> &'static str {
    let mut buf = [0u8; 4];
    let upper = c.encode_utf8(&mut buf).to_ascii_uppercase();
    MORSE_PAIRS
        .iter()
        .find(|(plain, _)| *plain == upper)
        .map(|(_, morse)| *morse)
        .unwrap_or("?")
}

fn decode_token(token: &str) -> &'static str {
    MORSE_PAIRS
        .iter()
        .find(|(_, morse)| *morse == token)
        .map(|(plain, _)| *plain)
        .unwrap_or("?")
}

pub fn process(input: MorseInput) -> MorseOutput {
    let text = input.text.trim();
    if text.is_empty() {
        return MorseOutput {
            result: String::new(),
            error: None,
        };
    }

    let result = match input.mode {
        MorseMode::Encode => text
            .split_whitespace()
            .map(|word| word.chars().map(encode_char).collect::<Vec<_>>().join(" "))
            .collect::<Vec<_>>()
            .join(" / "),
        MorseMode::Decode => text
            .split(" / ")
            .map(|word| word.split_whitespace().map(decode_token).collect::<String>())
            .collect::<Vec<_>>()
            .join(" "),
    };

    MorseOutput { result, error: None }
}
