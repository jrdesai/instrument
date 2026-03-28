//! Word counter: words, characters, lines, sentences, paragraphs, unique words,
//! average word length, and reading time.
//!
//! Sentence count uses a simple heuristic (`.`, `!`, `?`). Empty input returns
//! all zeros with no error.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use std::collections::HashSet;

/// Input for the Word Counter tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WordCounterInput {
    pub text: String,
}

/// Output for the Word Counter tool: all stats in one struct.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WordCounterOutput {
    pub words: u32,
    pub characters_with_spaces: u32,
    pub characters_without_spaces: u32,
    pub lines: u32,
    pub sentences: u32,
    pub paragraphs: u32,
    pub unique_words: u32,
    pub avg_word_length: f64,
    pub reading_time_seconds: u32,
    pub error: Option<String>,
}

/// Count words by splitting on whitespace and filtering empty strings.
fn count_words(text: &str) -> Vec<String> {
    text.split_whitespace()
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect()
}

/// Strip punctuation from the end of a word for unique-word counting.
fn strip_punctuation(word: &str) -> String {
    let trimmed = word.trim_matches(|c: char| !c.is_alphanumeric());
    trimmed.to_lowercase()
}

/// Compute all word-counter stats from the input text.
///
/// Empty input returns all zeros and no error. Reading time is based on
/// 200 words per minute, minimum 1 second when any words are present.
///
/// # Example
///
/// ```
/// use instrument_core::text::word_counter::{process, WordCounterInput};
///
/// let out = process(WordCounterInput {
///     text: "The quick brown fox.".to_string(),
/// });
/// assert_eq!(out.words, 4);
/// assert_eq!(out.sentences, 1);
/// ```
pub fn process(input: WordCounterInput) -> WordCounterOutput {
    let text = input.text.as_str();

    if text.is_empty() {
        return WordCounterOutput {
            words: 0,
            characters_with_spaces: 0,
            characters_without_spaces: 0,
            lines: 0,
            sentences: 0,
            paragraphs: 0,
            unique_words: 0,
            avg_word_length: 0.0,
            reading_time_seconds: 0,
            error: None,
        };
    }

    let words = count_words(text);
    let word_count = words.len();

    let characters_with_spaces = text.chars().count();
    let characters_without_spaces = text
        .chars()
        .filter(|c| !c.is_whitespace())
        .count();

    let lines: Vec<&str> = text.split('\n').collect();
    let lines_count = lines.iter().filter(|s| !s.trim().is_empty()).count();

    let sentences = text
        .chars()
        .filter(|c| matches!(c, '.' | '!' | '?'))
        .count();

    let paragraphs: Vec<&str> = text.split("\n\n").collect();
    let paragraphs_count = paragraphs
        .iter()
        .filter(|s| !s.trim().is_empty())
        .count();

    let unique_set: HashSet<String> = words
        .iter()
        .map(|w| strip_punctuation(w))
        .filter(|s| !s.is_empty())
        .collect();
    let unique_words = unique_set.len();

    let sum_len: usize = words.iter().map(|w| w.chars().count()).sum();
    let avg_word_length = if word_count == 0 {
        0.0
    } else {
        sum_len as f64 / word_count as f64
    };

    // 200 words per minute → reading_time_seconds = (words / 200) * 60 = words * 0.3
    let reading_time_seconds = if word_count == 0 {
        0u32
    } else {
        let secs = (word_count as f64 / 200.0) * 60.0;
        secs.ceil().max(1.0) as u32
    };

    WordCounterOutput {
        words: u32::try_from(word_count).unwrap_or(u32::MAX),
        characters_with_spaces: u32::try_from(characters_with_spaces).unwrap_or(u32::MAX),
        characters_without_spaces: u32::try_from(characters_without_spaces).unwrap_or(u32::MAX),
        lines: u32::try_from(lines_count).unwrap_or(u32::MAX),
        sentences: u32::try_from(sentences).unwrap_or(u32::MAX),
        paragraphs: u32::try_from(paragraphs_count).unwrap_or(u32::MAX),
        unique_words: u32::try_from(unique_words).unwrap_or(u32::MAX),
        avg_word_length,
        reading_time_seconds,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input() {
        let out = process(WordCounterInput {
            text: String::new(),
        });
        assert_eq!(out.words, 0);
        assert_eq!(out.characters_with_spaces, 0);
        assert_eq!(out.characters_without_spaces, 0);
        assert_eq!(out.lines, 0);
        assert_eq!(out.sentences, 0);
        assert_eq!(out.paragraphs, 0);
        assert_eq!(out.unique_words, 0);
        assert_eq!(out.avg_word_length, 0.0);
        assert_eq!(out.reading_time_seconds, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn single_word() {
        let out = process(WordCounterInput {
            text: "hello".to_string(),
        });
        assert_eq!(out.words, 1);
        assert_eq!(out.characters_with_spaces, 5);
        assert_eq!(out.characters_without_spaces, 5);
        assert_eq!(out.lines, 1);
        assert_eq!(out.sentences, 0);
        assert_eq!(out.paragraphs, 1);
        assert_eq!(out.unique_words, 1);
        assert!((out.avg_word_length - 5.0).abs() < 1e-9);
        assert_eq!(out.reading_time_seconds, 1);
    }

    #[test]
    fn multiple_words() {
        let out = process(WordCounterInput {
            text: "hello world".to_string(),
        });
        assert_eq!(out.words, 2);
        assert_eq!(out.characters_with_spaces, 11);
        assert_eq!(out.characters_without_spaces, 10);
    }

    #[test]
    fn with_punctuation() {
        let out = process(WordCounterInput {
            text: "Hello. World!".to_string(),
        });
        assert_eq!(out.words, 2);
        assert_eq!(out.sentences, 2);
    }

    #[test]
    fn lines_count() {
        let out = process(WordCounterInput {
            text: "line1\nline2\nline3".to_string(),
        });
        assert_eq!(out.lines, 3);
    }

    #[test]
    fn paragraphs_count() {
        let out = process(WordCounterInput {
            text: "para1\n\npara2".to_string(),
        });
        assert_eq!(out.paragraphs, 2);
    }

    #[test]
    fn unique_words() {
        let out = process(WordCounterInput {
            text: "the cat sat on the mat".to_string(),
        });
        assert_eq!(out.words, 6);
        assert_eq!(out.unique_words, 5);
    }

    #[test]
    fn reading_time() {
        let words_200 = (0..200).map(|i| format!("word{i}")).collect::<Vec<_>>().join(" ");
        let out = process(WordCounterInput {
            text: words_200,
        });
        assert_eq!(out.words, 200);
        assert_eq!(out.reading_time_seconds, 60);
    }
}
