//! Line-level text operations with chaining support.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum LineOperation {
    SortAsc,
    SortDesc,
    SortNaturalAsc,
    SortNaturalDesc,
    Deduplicate,
    Reverse,
    TrimWhitespace,
    RemoveEmpty,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LineToolsInput {
    pub text: String,
    /// Ordered list of operations applied left-to-right.
    pub operations: Vec<LineOperation>,
    /// For Deduplicate: keep first occurrence (true) or last (false).
    #[serde(default = "default_true")]
    pub keep_first: bool,
    /// For Sort/Deduplicate: case-insensitive comparison.
    #[serde(default = "default_true")]
    pub case_insensitive: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct LineToolsOutput {
    pub result: String,
    pub input_line_count: u32,
    pub output_line_count: u32,
    pub changed_count: u32,
    /// Line ending style detected in input: "lf" | "crlf"
    pub line_ending: String,
}

pub fn process(input: LineToolsInput) -> LineToolsOutput {
    let has_crlf = input.text.contains("\r\n");
    let line_ending = if has_crlf { "crlf" } else { "lf" };
    let normalized = input.text.replace("\r\n", "\n");

    let lines: Vec<&str> = normalized.split('\n').collect();
    let input_line_count = lines.len() as u32;
    let mut result_lines: Vec<String> = lines.iter().map(|l| (*l).to_string()).collect();

    for op in &input.operations {
        result_lines = apply_operation(
            result_lines,
            *op,
            input.keep_first,
            input.case_insensitive,
        );
    }

    let output_line_count = result_lines.len() as u32;
    let changed_count = input_line_count.saturating_sub(output_line_count);
    let joined = result_lines.join("\n");
    let result = if has_crlf {
        joined.replace('\n', "\r\n")
    } else {
        joined
    };

    LineToolsOutput {
        result,
        input_line_count,
        output_line_count,
        changed_count,
        line_ending: line_ending.to_string(),
    }
}

fn apply_operation(
    mut lines: Vec<String>,
    op: LineOperation,
    keep_first: bool,
    case_insensitive: bool,
) -> Vec<String> {
    match op {
        LineOperation::SortAsc => {
            if case_insensitive {
                lines.sort_by_key(|a| a.to_lowercase());
            } else {
                lines.sort();
            }
        }
        LineOperation::SortDesc => {
            if case_insensitive {
                lines.sort_by_key(|b| std::cmp::Reverse(b.to_lowercase()));
            } else {
                lines.sort();
                lines.reverse();
            }
        }
        LineOperation::SortNaturalAsc => {
            lines.sort_by(|a, b| natural_cmp(a, b));
        }
        LineOperation::SortNaturalDesc => {
            lines.sort_by(|a, b| natural_cmp(b, a));
        }
        LineOperation::Deduplicate => {
            let mut seen_set = std::collections::HashSet::new();
            let mut seen_order: Vec<String> = Vec::new();
            if keep_first {
                for l in lines {
                    let key = if case_insensitive {
                        l.to_lowercase()
                    } else {
                        l.clone()
                    };
                    if seen_set.insert(key) {
                        seen_order.push(l);
                    }
                }
            } else {
                for l in lines.into_iter().rev() {
                    let key = if case_insensitive {
                        l.to_lowercase()
                    } else {
                        l.clone()
                    };
                    if seen_set.insert(key) {
                        seen_order.push(l);
                    }
                }
                seen_order.reverse();
            }
            return seen_order;
        }
        LineOperation::Reverse => lines.reverse(),
        LineOperation::TrimWhitespace => {
            lines = lines.iter().map(|l| l.trim().to_string()).collect();
        }
        LineOperation::RemoveEmpty => {
            lines.retain(|l| !l.trim().is_empty());
        }
    }
    lines
}

/// Natural sort comparison: digit runs compare numerically (a2 < a10).
fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();
    let mut ai = a_lower.chars().peekable();
    let mut bi = b_lower.chars().peekable();

    loop {
        match (ai.peek(), bi.peek()) {
            (None, None) => return std::cmp::Ordering::Equal,
            (None, _) => return std::cmp::Ordering::Less,
            (_, None) => return std::cmp::Ordering::Greater,
            (Some(ac), Some(bc)) if ac.is_ascii_digit() && bc.is_ascii_digit() => {
                let an = collect_digits(&mut ai);
                let bn = collect_digits(&mut bi);
                match an.cmp(&bn) {
                    std::cmp::Ordering::Equal => continue,
                    other => return other,
                }
            }
            (Some(ac), Some(bc)) => match ac.cmp(bc) {
                std::cmp::Ordering::Equal => {
                    ai.next();
                    bi.next();
                }
                other => return other,
            },
        }
    }
}

fn collect_digits(iter: &mut std::iter::Peekable<std::str::Chars<'_>>) -> u64 {
    let mut n = String::new();
    while iter.peek().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        n.push(iter.next().unwrap_or_default());
    }
    n.parse().unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sort_asc() {
        let out = process(LineToolsInput {
            text: "banana\napple\ncherry".to_string(),
            operations: vec![LineOperation::SortAsc],
            keep_first: true,
            case_insensitive: true,
        });
        assert_eq!(out.result, "apple\nbanana\ncherry");
    }

    #[test]
    fn deduplicate_removes_duplicates() {
        let out = process(LineToolsInput {
            text: "a\nb\na\nc".to_string(),
            operations: vec![LineOperation::Deduplicate],
            keep_first: true,
            case_insensitive: false,
        });
        assert_eq!(out.result, "a\nb\nc");
        assert_eq!(out.output_line_count, 3);
    }

    #[test]
    fn remove_empty_lines() {
        let out = process(LineToolsInput {
            text: "a\n\nb\n   \nc".to_string(),
            operations: vec![LineOperation::RemoveEmpty],
            keep_first: true,
            case_insensitive: true,
        });
        assert_eq!(out.result, "a\nb\nc");
    }

    #[test]
    fn natural_sort_orders_numerically() {
        let out = process(LineToolsInput {
            text: "file10\nfile2\nfile1".to_string(),
            operations: vec![LineOperation::SortNaturalAsc],
            keep_first: true,
            case_insensitive: true,
        });
        assert_eq!(out.result, "file1\nfile2\nfile10");
    }

    #[test]
    fn chain_trim_then_deduplicate() {
        let out = process(LineToolsInput {
            text: "  hello  \nhello\nworld".to_string(),
            operations: vec![LineOperation::TrimWhitespace, LineOperation::Deduplicate],
            keep_first: true,
            case_insensitive: false,
        });
        assert_eq!(out.result, "hello\nworld");
    }

    #[test]
    fn crlf_preserved_in_output() {
        let out = process(LineToolsInput {
            text: "b\r\na\r\nc".to_string(),
            operations: vec![LineOperation::SortAsc],
            keep_first: true,
            case_insensitive: true,
        });
        assert!(out.result.contains("\r\n"));
        assert_eq!(out.line_ending, "crlf");
    }
}
