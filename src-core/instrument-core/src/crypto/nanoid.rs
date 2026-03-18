//! Nano ID generation using the `nanoid` crate.
//!
//! Nano IDs are URL-safe, random, compact identifiers.
//! Default: 21-character strings using `A-Za-z0-9_-`.

use nanoid::{format as nanoid_format, rngs::default as nanoid_default_rng};
use serde::{Deserialize, Serialize};

/// Default URL-safe alphabet (same as the nanoid JS library default).
const DEFAULT_ALPHABET: &str =
    "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

/// Input for Nano ID generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NanoIdInput {
    /// Number of IDs to generate (1–100).
    pub count: usize,
    /// Length of each ID (4–256). Default: 21.
    pub size: usize,
    /// Optional custom alphabet. If None or empty, uses the default URL-safe alphabet.
    pub alphabet: Option<String>,
}

/// Output from Nano ID generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NanoIdOutput {
    /// Generated IDs.
    pub ids: Vec<String>,
    /// Optional error message.
    pub error: Option<String>,
}

/// Generate one or more Nano IDs.
pub fn process(input: NanoIdInput) -> NanoIdOutput {
    if input.count == 0 || input.count > 100 {
        return NanoIdOutput {
            ids: Vec::new(),
            error: Some("count must be between 1 and 100".to_string()),
        };
    }
    if input.size == 0 || input.size > 256 {
        return NanoIdOutput {
            ids: Vec::new(),
            error: Some("size must be between 4 and 256".to_string()),
        };
    }

    let alphabet_str = match &input.alphabet {
        Some(s) if !s.trim().is_empty() => s.as_str(),
        _ => DEFAULT_ALPHABET,
    };

    let chars: Vec<char> = alphabet_str.chars().collect();

    if chars.len() < 2 {
        return NanoIdOutput {
            ids: Vec::new(),
            error: Some("alphabet must contain at least 2 distinct characters".to_string()),
        };
    }
    if chars.len() > 256 {
        return NanoIdOutput {
            ids: Vec::new(),
            error: Some("alphabet must not exceed 256 characters".to_string()),
        };
    }

    let size = input.size;
    let ids = (0..input.count)
        .map(|_| nanoid_format(nanoid_default_rng, &chars, size))
        .collect();

    NanoIdOutput { ids, error: None }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn default_input() -> NanoIdInput {
        NanoIdInput {
            count: 1,
            size: 21,
            alphabet: None,
        }
    }

    #[test]
    fn generates_one() {
        let out = process(default_input());
        assert!(out.error.is_none());
        assert_eq!(out.ids.len(), 1);
        assert_eq!(out.ids[0].len(), 21);
    }

    #[test]
    fn generates_multiple() {
        let out = process(NanoIdInput {
            count: 5,
            ..default_input()
        });
        assert!(out.error.is_none());
        assert_eq!(out.ids.len(), 5);
    }

    #[test]
    fn all_unique() {
        let out = process(NanoIdInput {
            count: 20,
            ..default_input()
        });
        assert!(out.error.is_none());
        let set: HashSet<_> = out.ids.iter().collect();
        assert_eq!(set.len(), 20);
    }

    #[test]
    fn custom_size() {
        let out = process(NanoIdInput {
            count: 1,
            size: 10,
            alphabet: None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.ids[0].len(), 10);
    }

    #[test]
    fn custom_alphabet() {
        let out = process(NanoIdInput {
            count: 3,
            size: 8,
            alphabet: Some("abc".to_string()),
        });
        assert!(out.error.is_none());
        for id in &out.ids {
            assert_eq!(id.len(), 8);
            assert!(id.chars().all(|c| "abc".contains(c)));
        }
    }

    #[test]
    fn count_too_high() {
        let out = process(NanoIdInput {
            count: 101,
            ..default_input()
        });
        assert!(out.error.is_some());
        assert!(out.ids.is_empty());
    }

    #[test]
    fn size_zero() {
        let out = process(NanoIdInput {
            count: 1,
            size: 0,
            alphabet: None,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn alphabet_too_short() {
        let out = process(NanoIdInput {
            count: 1,
            size: 5,
            alphabet: Some("a".to_string()),
        });
        assert!(out.error.is_some());
    }
}

