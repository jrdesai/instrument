//! Lorem ipsum placeholder text generator.
//!
//! Outputs paragraphs, sentences, or words from an embedded corpus.
//! Deterministic: same input always produces the same output (cycle through pool).

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Lorem Ipsum generator.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LoremIpsumInput {
    pub output_type: LoremOutputType,
    pub count: usize,
    pub start_with_classic: bool,
}

/// Output format: paragraphs, sentences, or words.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum LoremOutputType {
    Paragraphs,
    Sentences,
    Words,
}

/// Output: generated text and actual word/sentence/paragraph counts.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LoremIpsumOutput {
    pub result: String,
    pub word_count: usize,
    pub paragraph_count: usize,
    pub sentence_count: usize,
    pub error: Option<String>,
}

const CLASSIC_OPENING: &str =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const SENTENCES: &[&str] = &[
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
    "Excepteur sint occaecat cupidatat non proident sunt in culpa.",
    "Nulla pariatur excepteur sint occaecat cupidatat non proident.",
    "Curabitur pretium tincidunt lacus nulla mauris accumsan nulla.",
    "Vestibulum ante ipsum primis in faucibus orci luctus ultrices.",
    "Pellentesque habitant morbi tristique senectus et netus malesuada.",
    "Praesent commodo cursus magna vel scelerisque nisl consectetur.",
    "Donec sed odio dui cras mattis consectetur purus sit amet.",
    "Nullam quis risus eget urna mollis ornare vel eu leo.",
    "Maecenas faucibus mollis interdum aenean lacinia bibendum.",
    "Morbi leo risus porta ac consectetur ac vestibulum at eros.",
    "Fusce dapibus tellus ac cursus commodo tortor mauris condimentum.",
    "Integer posuere erat a ante venenatis dapibus posuere velit aliquet.",
    "Aenean lacinia bibendum nulla sed consectetur nullam.",
    "Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor.",
    "Cum sociis natoque penatibus et magnis dis parturient montes.",
    "Etiam porta sem malesuada magna mollis euismod donec.",
    "Cras mattis consectetur purus sit amet fermentum integer.",
];

const WORDS: &[&str] = &[
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
    "eiusmod", "tempor", "incididunt", "labore", "dolore", "magna", "aliqua", "enim", "minim",
    "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip", "commodo",
    "consequat", "duis", "aute", "irure", "reprehenderit", "voluptate", "velit", "esse", "cillum",
    "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "proident",
    "culpa", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum", "curabitur",
    "pretium", "tincidunt", "lacus", "vestibulum", "ante", "faucibus",
];

const MIN_SENTENCES_PER_PARAGRAPH: usize = 3;
const MAX_SENTENCES_PER_PARAGRAPH: usize = 6;

fn count_words(s: &str) -> usize {
    s.split_whitespace().filter(|w| !w.is_empty()).count()
}

fn count_sentences(s: &str) -> usize {
    s.chars().filter(|c| matches!(c, '.' | '!' | '?')).count()
}

fn count_paragraphs(s: &str) -> usize {
    s.split("\n\n").filter(|p| !p.trim().is_empty()).count()
}

/// Generate lorem ipsum text.
///
/// Count must be 1–50. Deterministic: cycles through the corpus so the same
/// input always yields the same output.
///
/// # Example
///
/// ```
/// use instrument_core::text::lorem_ipsum::{
///     process, LoremIpsumInput, LoremOutputType,
/// };
///
/// let out = process(LoremIpsumInput {
///     output_type: LoremOutputType::Words,
///     count: 5,
///     start_with_classic: true,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.word_count, 5);
/// assert!(out.result.starts_with("Lorem"));
/// ```
pub fn process(input: LoremIpsumInput) -> LoremIpsumOutput {
    if input.count == 0 || input.count > 50 {
        return LoremIpsumOutput {
            result: String::new(),
            word_count: 0,
            paragraph_count: 0,
            sentence_count: 0,
            error: Some("Count must be between 1 and 50".to_string()),
        };
    }

    let result = match input.output_type {
        LoremOutputType::Paragraphs => generate_paragraphs(input.count, input.start_with_classic),
        LoremOutputType::Sentences => generate_sentences(input.count, input.start_with_classic),
        LoremOutputType::Words => generate_words(input.count, input.start_with_classic),
    };

    let word_count = count_words(&result);
    let sentence_count = count_sentences(&result);
    let paragraph_count = count_paragraphs(&result);

    LoremIpsumOutput {
        result,
        word_count,
        paragraph_count,
        sentence_count,
        error: None,
    }
}

fn generate_paragraphs(count: usize, start_with_classic: bool) -> String {
    let mut out = String::new();
    let mut sent_idx: usize = 0;
    for p in 0..count {
        if p > 0 {
            out.push_str("\n\n");
        }
        let num_sent = MIN_SENTENCES_PER_PARAGRAPH
            + (p + count) % (MAX_SENTENCES_PER_PARAGRAPH - MIN_SENTENCES_PER_PARAGRAPH + 1);
        for s in 0..num_sent {
            if s > 0 {
                out.push(' ');
            }
            let sentence = if start_with_classic && p == 0 && s == 0 {
                CLASSIC_OPENING
            } else {
                let s = SENTENCES[sent_idx % SENTENCES.len()];
                sent_idx += 1;
                s
            };
            out.push_str(sentence);
        }
    }
    out
}

fn generate_sentences(count: usize, start_with_classic: bool) -> String {
    let mut out = String::new();
    for i in 0..count {
        if i > 0 {
            out.push(' ');
        }
        let sentence = if start_with_classic && i == 0 {
            CLASSIC_OPENING
        } else {
            let idx = if start_with_classic { i - 1 } else { i };
            SENTENCES[idx % SENTENCES.len()]
        };
        out.push_str(sentence);
    }
    out
}

fn generate_words(count: usize, start_with_classic: bool) -> String {
    let mut out = String::new();
    for i in 0..count {
        if i > 0 {
            out.push(' ');
        }
        let word = if start_with_classic && i == 0 {
            "Lorem".to_string()
        } else {
            let idx = if start_with_classic { i - 1 } else { i };
            let w = WORDS[idx % WORDS.len()];
            if i == 0 && !start_with_classic {
                let mut c = w.chars();
                match c.next() {
                    Some(first) => first.to_uppercase().chain(c).collect(),
                    None => w.to_string(),
                }
            } else {
                w.to_string()
            }
        };
        out.push_str(&word);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_paragraphs() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Paragraphs,
            count: 2,
            start_with_classic: false,
        });
        assert!(out.error.is_none());
        let paras: Vec<&str> = out.result.split("\n\n").filter(|s| !s.is_empty()).collect();
        assert_eq!(paras.len(), 2);
    }

    #[test]
    fn generates_sentences() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Sentences,
            count: 3,
            start_with_classic: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.sentence_count, 3);
    }

    #[test]
    fn generates_words() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Words,
            count: 10,
            start_with_classic: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.word_count, 10);
    }

    #[test]
    fn classic_start() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Paragraphs,
            count: 1,
            start_with_classic: true,
        });
        assert!(out.error.is_none());
        assert!(out.result.starts_with("Lorem ipsum dolor sit amet"));
    }

    #[test]
    fn no_classic() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Sentences,
            count: 1,
            start_with_classic: false,
        });
        assert!(out.error.is_none());
        assert!(!out.result.starts_with("Lorem ipsum"));
    }

    #[test]
    fn count_too_high() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Words,
            count: 51,
            start_with_classic: false,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn count_zero() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Words,
            count: 0,
            start_with_classic: false,
        });
        assert!(out.error.is_some());
        assert!(out.result.is_empty());
    }

    #[test]
    fn word_count_accurate() {
        let out = process(LoremIpsumInput {
            output_type: LoremOutputType::Words,
            count: 15,
            start_with_classic: true,
        });
        assert!(out.error.is_none());
        let actual_words = out.result.split_whitespace().count();
        assert_eq!(out.word_count, actual_words);
    }
}
