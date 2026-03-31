use similar::{ChangeTag, TextDiff};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextDiffInput {
    pub left: String,
    pub right: String,
    /// Defaults to Word if omitted.
    #[serde(default = "default_granularity")]
    pub granularity: DiffGranularity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum DiffGranularity {
    Line,
    Word,
    Char,
}

fn default_granularity() -> DiffGranularity {
    DiffGranularity::Word
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[specta(rename = "TextDiffLineAnnotation")]
#[ts(export, export_to = "TextDiffLineAnnotation.ts")]
pub enum LineAnnotation {
    Unchanged,
    Added,
    Removed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[specta(rename = "TextDiffSpan")]
#[ts(export, export_to = "TextDiffSpan.ts")]
pub struct InlineSpan {
    pub text: String,
    /// true = this segment is different (highlight it); false = unchanged
    pub highlighted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[specta(rename = "TextDiffAnnotatedLine")]
#[ts(export, export_to = "TextDiffAnnotatedLine.ts")]
pub struct AnnotatedLine {
    pub line_number: u32,
    pub content: String,
    pub annotation: LineAnnotation,
    /// Inline spans for word/char granularity on changed lines.
    /// Empty for unchanged lines or when granularity is Line.
    pub spans: Vec<InlineSpan>,
    /// true when char granularity fell back to full-line highlight.
    pub fell_back: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextDiffOutput {
    pub is_identical: bool,
    pub added_count: u32,
    pub removed_count: u32,
    pub unchanged_count: u32,
    pub left_annotated: Vec<AnnotatedLine>,
    pub right_annotated: Vec<AnnotatedLine>,
    /// true if any line fell back from char granularity to full-line highlight.
    pub has_fallback: bool,
}

/// Compute word-level inline spans between two strings.
fn word_spans(left: &str, right: &str) -> (Vec<InlineSpan>, Vec<InlineSpan>) {
    let left_tokens = tokenise_words(left);
    let right_tokens = tokenise_words(right);
    let diff = TextDiff::from_slices(&left_tokens, &right_tokens);

    let mut left_spans = Vec::new();
    let mut right_spans = Vec::new();

    for change in diff.iter_all_changes() {
        let text = change.value().to_string();
        match change.tag() {
            ChangeTag::Equal => {
                left_spans.push(InlineSpan {
                    text: text.clone(),
                    highlighted: false,
                });
                right_spans.push(InlineSpan {
                    text,
                    highlighted: false,
                });
            }
            ChangeTag::Delete => left_spans.push(InlineSpan {
                text,
                highlighted: true,
            }),
            ChangeTag::Insert => right_spans.push(InlineSpan {
                text,
                highlighted: true,
            }),
        }
    }

    (left_spans, right_spans)
}

/// Tokenise into words and whitespace runs.
fn tokenise_words(s: &str) -> Vec<&str> {
    if s.is_empty() {
        return Vec::new();
    }

    let mut tokens = Vec::new();
    let mut start = 0usize;
    let mut in_word = !s.starts_with(char::is_whitespace);

    for (i, c) in s.char_indices() {
        let is_ws = c.is_whitespace();
        if is_ws == in_word {
            tokens.push(&s[start..i]);
            start = i;
            in_word = !is_ws;
        }
    }

    if start < s.len() {
        tokens.push(&s[start..]);
    }

    tokens
}

/// Compute character-level inline spans and fallback flag.
fn char_spans(left: &str, right: &str) -> (Vec<InlineSpan>, Vec<InlineSpan>, bool) {
    let left_chars: Vec<&str> = left
        .char_indices()
        .map(|(i, c)| &left[i..i + c.len_utf8()])
        .collect();
    let right_chars: Vec<&str> = right
        .char_indices()
        .map(|(i, c)| &right[i..i + c.len_utf8()])
        .collect();

    let diff = TextDiff::from_slices(&left_chars, &right_chars);

    let mut left_spans = Vec::new();
    let mut right_spans = Vec::new();
    let mut changed_chars = 0usize;
    let total_chars = left_chars.len().max(right_chars.len());

    for change in diff.iter_all_changes() {
        let text = change.value().to_string();
        match change.tag() {
            ChangeTag::Equal => {
                left_spans.push(InlineSpan {
                    text: text.clone(),
                    highlighted: false,
                });
                right_spans.push(InlineSpan {
                    text,
                    highlighted: false,
                });
            }
            ChangeTag::Delete => {
                changed_chars += text.chars().count();
                left_spans.push(InlineSpan {
                    text,
                    highlighted: true,
                });
            }
            ChangeTag::Insert => {
                changed_chars += text.chars().count();
                right_spans.push(InlineSpan {
                    text,
                    highlighted: true,
                });
            }
        }
    }

    let fell_back = total_chars > 0 && changed_chars * 100 / total_chars > 60;
    (left_spans, right_spans, fell_back)
}

pub fn process(input: TextDiffInput) -> TextDiffOutput {
    let diff = TextDiff::from_lines(&input.left, &input.right);

    let mut left_annotated: Vec<AnnotatedLine> = Vec::new();
    let mut right_annotated: Vec<AnnotatedLine> = Vec::new();
    let mut added_count: u32 = 0;
    let mut removed_count: u32 = 0;
    let mut unchanged_count: u32 = 0;
    let mut has_fallback = false;

    let mut left_line: u32 = 1;
    let mut right_line: u32 = 1;
    let changes: Vec<_> = diff.iter_all_changes().collect();
    let mut i = 0usize;

    while i < changes.len() {
        let change = &changes[i];
        match change.tag() {
            ChangeTag::Equal => {
                let content = change.value().trim_end_matches('\n').to_string();
                left_annotated.push(AnnotatedLine {
                    line_number: left_line,
                    content: content.clone(),
                    annotation: LineAnnotation::Unchanged,
                    spans: vec![],
                    fell_back: false,
                });
                right_annotated.push(AnnotatedLine {
                    line_number: right_line,
                    content,
                    annotation: LineAnnotation::Unchanged,
                    spans: vec![],
                    fell_back: false,
                });
                left_line += 1;
                right_line += 1;
                unchanged_count += 1;
                i += 1;
            }
            ChangeTag::Delete => {
                let mut removed_lines = Vec::new();
                while i < changes.len() && changes[i].tag() == ChangeTag::Delete {
                    removed_lines.push(changes[i].value().trim_end_matches('\n').to_string());
                    i += 1;
                }

                let mut added_lines = Vec::new();
                while i < changes.len() && changes[i].tag() == ChangeTag::Insert {
                    added_lines.push(changes[i].value().trim_end_matches('\n').to_string());
                    i += 1;
                }

                let pair_count = removed_lines.len().min(added_lines.len());

                for p in 0..pair_count {
                    let left_content = &removed_lines[p];
                    let right_content = &added_lines[p];

                    let (left_spans, right_spans, fell_back) = match input.granularity {
                        DiffGranularity::Line => (vec![], vec![], false),
                        DiffGranularity::Word => {
                            let (ls, rs) = word_spans(left_content, right_content);
                            (ls, rs, false)
                        }
                        DiffGranularity::Char => char_spans(left_content, right_content),
                    };

                    if fell_back {
                        has_fallback = true;
                    }

                    left_annotated.push(AnnotatedLine {
                        line_number: left_line,
                        content: left_content.clone(),
                        annotation: LineAnnotation::Removed,
                        spans: if fell_back { vec![] } else { left_spans },
                        fell_back,
                    });
                    right_annotated.push(AnnotatedLine {
                        line_number: right_line,
                        content: right_content.clone(),
                        annotation: LineAnnotation::Added,
                        spans: if fell_back { vec![] } else { right_spans },
                        fell_back,
                    });

                    left_line += 1;
                    right_line += 1;
                    removed_count += 1;
                    added_count += 1;
                }

                for content in removed_lines.iter().skip(pair_count) {
                    left_annotated.push(AnnotatedLine {
                        line_number: left_line,
                        content: content.clone(),
                        annotation: LineAnnotation::Removed,
                        spans: vec![],
                        fell_back: false,
                    });
                    left_line += 1;
                    removed_count += 1;
                }

                for content in added_lines.iter().skip(pair_count) {
                    right_annotated.push(AnnotatedLine {
                        line_number: right_line,
                        content: content.clone(),
                        annotation: LineAnnotation::Added,
                        spans: vec![],
                        fell_back: false,
                    });
                    right_line += 1;
                    added_count += 1;
                }
            }
            ChangeTag::Insert => {
                let content = change.value().trim_end_matches('\n').to_string();
                right_annotated.push(AnnotatedLine {
                    line_number: right_line,
                    content,
                    annotation: LineAnnotation::Added,
                    spans: vec![],
                    fell_back: false,
                });
                right_line += 1;
                added_count += 1;
                i += 1;
            }
        }
    }

    let is_identical = added_count == 0 && removed_count == 0;

    TextDiffOutput {
        is_identical,
        added_count,
        removed_count,
        unchanged_count,
        left_annotated,
        right_annotated,
        has_fallback,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_word_granularity_comma() {
        let out = process(TextDiffInput {
            left: "Hello World".to_string(),
            right: "Hello, World".to_string(),
            granularity: DiffGranularity::Word,
        });
        assert!(!out.is_identical);
        let left_line = &out.left_annotated[0];
        assert!(!left_line.spans.is_empty());
        assert!(!left_line.fell_back);
    }

    #[test]
    fn test_char_fallback_threshold() {
        let out = process(TextDiffInput {
            left: "abcdefghij".to_string(),
            right: "zyxwvutsrq".to_string(),
            granularity: DiffGranularity::Char,
        });
        assert!(out.has_fallback);
    }

    #[test]
    fn test_line_granularity_no_spans() {
        let out = process(TextDiffInput {
            left: "Hello World".to_string(),
            right: "Hello, World".to_string(),
            granularity: DiffGranularity::Line,
        });
        let left_line = &out.left_annotated[0];
        assert!(left_line.spans.is_empty());
    }
}

