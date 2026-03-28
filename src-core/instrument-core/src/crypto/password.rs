//! Password generation using the `rand` crate.
//!
//! Generates cryptographically random passwords from a configurable
//! alphabet. Computes Shannon entropy to drive a strength classification.

use rand::{distributions::Uniform, Rng};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Strength tier based on Shannon entropy of the generated password.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[ts(export)]
pub enum PasswordStrength {
    Weak,       // < 40 bits
    Fair,       // 40–59 bits
    Strong,     // 60–79 bits
    VeryStrong, // ≥ 80 bits
}

/// Input for the Password Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PasswordInput {
    /// Password length. Clamped to 4–256.
    pub length: u32,
    /// Number of passwords to generate. Clamped to 1–50.
    pub count: u32,
    pub include_uppercase: bool,
    pub include_lowercase: bool,
    pub include_numbers: bool,
    pub include_symbols: bool,
    /// When true, removes visually ambiguous chars: 0, O, o, 1, I, l.
    pub exclude_ambiguous: bool,
    /// Symbol set to use when include_symbols is true.
    /// Defaults to "!@#$%^&*()-_=+[]{}|;:,.<>?" if empty.
    pub symbols: String,
}

/// Output from the Password Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PasswordOutput {
    pub passwords: Vec<String>,
    pub strength: PasswordStrength,
    /// Shannon entropy: length × log₂(alphabet_size). 0.0 when alphabet is empty.
    pub entropy_bits: f64,
    /// Size of the effective alphabet used for generation.
    pub alphabet_size: u32,
    pub error: Option<String>,
}

const DEFAULT_SYMBOLS: &str = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS: &[char] = &['0', 'O', 'o', '1', 'I', 'l'];

pub fn process(input: PasswordInput) -> PasswordOutput {
    let length = input.length.clamp(4, 256) as usize;
    let count = input.count.clamp(1, 50) as usize;

    // Build alphabet
    let mut alphabet: Vec<char> = Vec::new();
    if input.include_uppercase {
        alphabet.extend('A'..='Z');
    }
    if input.include_lowercase {
        alphabet.extend('a'..='z');
    }
    if input.include_numbers {
        alphabet.extend('0'..='9');
    }
    if input.include_symbols {
        let sym = if input.symbols.is_empty() {
            DEFAULT_SYMBOLS.to_string()
        } else {
            input.symbols.clone()
        };
        alphabet.extend(sym.chars());
    }

    // Remove ambiguous characters if requested
    if input.exclude_ambiguous {
        alphabet.retain(|c| !AMBIGUOUS.contains(c));
    }

    // Deduplicate while preserving order
    let mut seen = std::collections::HashSet::new();
    alphabet.retain(|c| seen.insert(*c));

    if alphabet.is_empty() {
        return PasswordOutput {
            passwords: vec![],
            strength: PasswordStrength::Weak,
            entropy_bits: 0.0,
            alphabet_size: 0,
            error: Some("No characters available — enable at least one character set.".to_string()),
        };
    }

    let alphabet_size = alphabet.len();
    let entropy_bits = (length as f64) * (alphabet_size as f64).log2();

    let strength = match entropy_bits as u32 {
        0..=39  => PasswordStrength::Weak,
        40..=59 => PasswordStrength::Fair,
        60..=79 => PasswordStrength::Strong,
        _       => PasswordStrength::VeryStrong,
    };

    let dist = Uniform::from(0..alphabet_size);
    let mut rng = rand::thread_rng();

    let passwords = (0..count)
        .map(|_| {
            (0..length)
                .map(|_| alphabet[rng.sample(dist)])
                .collect::<String>()
        })
        .collect();

    PasswordOutput {
        passwords,
        strength,
        entropy_bits,
        alphabet_size: alphabet_size as u32,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_input() -> PasswordInput {
        PasswordInput {
            length: 16,
            count: 1,
            include_uppercase: true,
            include_lowercase: true,
            include_numbers: true,
            include_symbols: false,
            exclude_ambiguous: false,
            symbols: String::new(),
        }
    }

    #[test]
    fn generates_correct_length() {
        let out = process(default_input());
        assert!(out.error.is_none());
        assert_eq!(out.passwords.len(), 1);
        assert_eq!(out.passwords[0].chars().count(), 16);
    }

    #[test]
    fn generates_multiple() {
        let out = process(PasswordInput { count: 5, ..default_input() });
        assert_eq!(out.passwords.len(), 5);
    }

    #[test]
    fn respects_uppercase_only() {
        let out = process(PasswordInput {
            include_lowercase: false,
            include_numbers: false,
            ..default_input()
        });
        assert!(out.error.is_none());
        for c in out.passwords[0].chars() {
            assert!(c.is_uppercase(), "expected uppercase, got {c}");
        }
    }

    #[test]
    fn no_ambiguous_when_excluded() {
        let out = process(PasswordInput {
            exclude_ambiguous: true,
            length: 100,
            ..default_input()
        });
        for c in out.passwords[0].chars() {
            assert!(!AMBIGUOUS.contains(&c), "ambiguous char found: {c}");
        }
    }

    #[test]
    fn empty_alphabet_returns_error() {
        let out = process(PasswordInput {
            include_uppercase: false,
            include_lowercase: false,
            include_numbers: false,
            include_symbols: false,
            ..default_input()
        });
        assert!(out.error.is_some());
        assert!(out.passwords.is_empty());
    }

    #[test]
    fn entropy_increases_with_length() {
        let short = process(PasswordInput { length: 8,  ..default_input() });
        let long  = process(PasswordInput { length: 32, ..default_input() });
        assert!(long.entropy_bits > short.entropy_bits);
    }

    #[test]
    fn very_strong_password() {
        let out = process(PasswordInput {
            length: 24,
            include_symbols: true,
            ..default_input()
        });
        assert_eq!(out.strength, PasswordStrength::VeryStrong);
    }

    #[test]
    fn weak_short_password() {
        let out = process(PasswordInput {
            length: 4,
            include_lowercase: false,
            include_numbers: false,
            include_symbols: false,
            ..default_input()
        });
        assert_eq!(out.strength, PasswordStrength::Weak);
    }

    #[test]
    fn custom_symbols_used() {
        let out = process(PasswordInput {
            include_uppercase: false,
            include_lowercase: false,
            include_numbers: false,
            include_symbols: true,
            symbols: "!".to_string(),
            length: 8,
            count: 1,
            exclude_ambiguous: false,
        });
        assert!(out.error.is_none());
        assert!(out.passwords[0].chars().all(|c| c == '!'));
    }
}
