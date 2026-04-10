//! URL-safe slug generation: ASCII transliteration, separator collapse, optional max length.

use deunicode::deunicode;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Slug Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SlugInput {
    pub text: String,
    pub separator: String,
    pub lowercase: bool,
    pub max_length: Option<u32>,
}

/// Output of slug generation.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SlugOutput {
    pub slug: String,
    pub error: Option<String>,
}

fn normalize_separator(sep: &str) -> char {
    let allowed = ['-', '_', '.'];
    sep
        .chars()
        .next()
        .filter(|c| allowed.contains(c))
        .unwrap_or('-')
}

fn strip_trailing_sep(s: &str, sep: char) -> String {
    s.trim_matches(sep).to_string()
}

/// Converts text to a slug per `SlugInput` options.
pub fn process(input: SlugInput) -> SlugOutput {
    let sep_char = normalize_separator(&input.separator);
    let transliterated = deunicode(&input.text);
    let s = if input.lowercase {
        transliterated.to_lowercase()
    } else {
        transliterated
    };

    let mut out = String::new();
    let mut prev_sep = false;
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            prev_sep = false;
        } else if !prev_sep && !out.is_empty() {
            out.push(sep_char);
            prev_sep = true;
        } else if !prev_sep && out.is_empty() {
            prev_sep = true;
        }
    }

    let mut slug = strip_trailing_sep(&out, sep_char);

    if let Some(max) = input.max_length.filter(|&m| m > 0) {
        let max = max as usize;
        if slug.chars().count() > max {
            slug = slug.chars().take(max).collect();
            slug = strip_trailing_sep(&slug, sep_char);
        }
    }

    if slug.is_empty() {
        return SlugOutput {
            slug: String::new(),
            error: Some("Input produced an empty slug".to_string()),
        };
    }

    SlugOutput {
        slug,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic() {
        let out = process(SlugInput {
            text: "Hello World".to_string(),
            separator: "-".to_string(),
            lowercase: true,
            max_length: None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.slug, "hello-world");
    }

    #[test]
    fn test_unicode() {
        let out = process(SlugInput {
            text: "Ångström café".to_string(),
            separator: "-".to_string(),
            lowercase: true,
            max_length: None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.slug, "angstrom-cafe");
    }

    #[test]
    fn test_separator_underscore() {
        let out = process(SlugInput {
            text: "hello world".to_string(),
            separator: "_".to_string(),
            lowercase: true,
            max_length: None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.slug, "hello_world");
    }

    #[test]
    fn test_max_length() {
        let out = process(SlugInput {
            text: "hello-world".to_string(),
            separator: "-".to_string(),
            lowercase: true,
            max_length: Some(5),
        });
        assert!(out.error.is_none());
        assert_eq!(out.slug, "hello");
    }

    #[test]
    fn test_empty() {
        let out = process(SlugInput {
            text: "".to_string(),
            separator: "-".to_string(),
            lowercase: true,
            max_length: None,
        });
        assert!(out.error.is_some());
    }
}
