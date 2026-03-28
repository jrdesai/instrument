//! Passphrase generation from an embedded wordlist.
//!
//! Uses an embedded wordlist. Entropy is log2(wordlist_size) * word_count bits
//! plus optional number and symbol entropy.

use rand::{distributions::Uniform, Rng};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::OnceLock;
use ts_rs::TS;

/// Raw wordlist embedded at compile time.
static WORDLIST_RAW: &str = include_str!("wordlist.txt");

/// Lazily-initialised word list (trimmed, non-empty lines).
fn wordlist() -> &'static [&'static str] {
    static LIST: OnceLock<Vec<&'static str>> = OnceLock::new();
    LIST.get_or_init(|| {
        WORDLIST_RAW
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty())
            .collect()
    })
}

/// Word separator style.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[ts(export)]
pub enum PassphraseSeparator {
    Hyphen,
    Space,
    Dot,
    Underscore,
    None,
}

impl PassphraseSeparator {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Hyphen => "-",
            Self::Space => " ",
            Self::Dot => ".",
            Self::Underscore => "_",
            Self::None => "",
        }
    }
}

/// Input for the Passphrase Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PassphraseInput {
    /// Number of words per passphrase. Clamped to 3–12.
    pub word_count: u32,
    /// Number of passphrases to generate. Clamped to 1–20.
    pub count: u32,
    pub separator: PassphraseSeparator,
    /// Capitalise the first letter of each word.
    pub capitalize: bool,
    /// Append a random digit (0–9) at the end.
    pub include_number: bool,
    /// Append a random symbol from `!@#$%&*?` at the end.
    pub include_symbol: bool,
}

/// Output from the Passphrase Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PassphraseOutput {
    pub passphrases: Vec<String>,
    /// Shannon entropy in bits (log2(wordlist) * words, + extras).
    #[ts(type = "number")]
    pub entropy_bits: f64,
    pub word_count: u32,
    pub wordlist_size: u32,
    pub error: Option<String>,
}

const SYMBOLS: &[char] = &['!', '@', '#', '$', '%', '&', '*', '?'];

pub fn process(input: PassphraseInput) -> PassphraseOutput {
    let words = wordlist();
    if words.is_empty() {
        return PassphraseOutput {
            passphrases: vec![],
            entropy_bits: 0.0,
            word_count: 0,
            wordlist_size: 0,
            error: Some("Wordlist is empty.".into()),
        };
    }

    let word_count = input.word_count.clamp(3, 12) as usize;
    let count = input.count.clamp(1, 20) as usize;
    let sep = input.separator.as_str();

    // Entropy: word selection + optional number + optional symbol
    let word_entropy = (words.len() as f64).log2() * word_count as f64;
    let number_entropy = if input.include_number {
        10_f64.log2()
    } else {
        0.0
    };
    let symbol_entropy = if input.include_symbol {
        (SYMBOLS.len() as f64).log2()
    } else {
        0.0
    };
    let entropy_bits = word_entropy + number_entropy + symbol_entropy;

    let word_dist = Uniform::from(0..words.len());
    let mut rng = rand::thread_rng();

    let passphrases = (0..count)
        .map(|_| {
            let parts: Vec<String> = (0..word_count)
                .map(|_| {
                    let w = words[rng.sample(word_dist)];
                    if input.capitalize {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                        }
                    } else {
                        w.to_string()
                    }
                })
                .collect();

            let mut phrase = parts.join(sep);

            if input.include_number {
                let digit = rng.gen_range(0u8..10);
                phrase.push_str(&digit.to_string());
            }
            if input.include_symbol {
                let sym = SYMBOLS[rng.sample(Uniform::from(0..SYMBOLS.len()))];
                phrase.push(sym);
            }

            phrase
        })
        .collect();

    PassphraseOutput {
        passphrases,
        entropy_bits,
        word_count: word_count as u32,
        wordlist_size: words.len() as u32,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_input() -> PassphraseInput {
        PassphraseInput {
            word_count: 4,
            count: 1,
            separator: PassphraseSeparator::Hyphen,
            capitalize: false,
            include_number: false,
            include_symbol: false,
        }
    }

    #[test]
    fn generates_one() {
        let out = process(default_input());
        assert!(out.error.is_none());
        assert_eq!(out.passphrases.len(), 1);
    }

    #[test]
    fn correct_word_count() {
        let out = process(default_input());
        // 4 words separated by hyphen → 3 hyphens
        assert_eq!(out.passphrases[0].matches('-').count(), 3);
    }

    #[test]
    fn generates_multiple() {
        let out = process(PassphraseInput {
            count: 5,
            ..default_input()
        });
        assert_eq!(out.passphrases.len(), 5);
    }

    #[test]
    fn capitalize_works() {
        let out = process(PassphraseInput {
            capitalize: true,
            ..default_input()
        });
        for part in out.passphrases[0].split('-') {
            let first = part.chars().next().unwrap();
            assert!(first.is_uppercase(), "expected uppercase first char, got {first}");
        }
    }

    #[test]
    fn includes_number() {
        let out = process(PassphraseInput {
            separator: PassphraseSeparator::None,
            include_number: true,
            ..default_input()
        });
        let last = out.passphrases[0].chars().last().unwrap();
        assert!(last.is_ascii_digit(), "expected digit at end, got {last}");
    }

    #[test]
    fn includes_symbol() {
        let out = process(PassphraseInput {
            separator: PassphraseSeparator::None,
            include_symbol: true,
            ..default_input()
        });
        let last = out.passphrases[0].chars().last().unwrap();
        assert!(SYMBOLS.contains(&last), "expected symbol at end, got {last}");
    }

    #[test]
    fn entropy_increases_with_words() {
        let short = process(PassphraseInput {
            word_count: 3,
            ..default_input()
        });
        let long = process(PassphraseInput {
            word_count: 6,
            ..default_input()
        });
        assert!(long.entropy_bits > short.entropy_bits);
    }

    #[test]
    fn space_separator() {
        let out = process(PassphraseInput {
            separator: PassphraseSeparator::Space,
            ..default_input()
        });
        assert!(out.passphrases[0].contains(' '));
    }

    #[test]
    fn no_separator() {
        let out = process(PassphraseInput {
            separator: PassphraseSeparator::None,
            ..default_input()
        });
        assert!(!out.passphrases[0].contains('-'));
    }

    #[test]
    fn clamp_word_count_min() {
        let out = process(PassphraseInput {
            word_count: 1,
            ..default_input()
        });
        assert_eq!(out.word_count, 3);
    }

    #[test]
    fn wordlist_loaded() {
        let out = process(default_input());
        assert!(
            out.wordlist_size >= 100,
            "wordlist too small: {}",
            out.wordlist_size
        );
    }
}
