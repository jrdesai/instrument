//! JSON formatter: pretty-print, minify, compact, sort keys.
//!
//! # Example
//!
//! ```
//! use instrument_core::json::formatter::{process, IndentStyle, JsonFormatInput, JsonFormatMode};
//!
//! let out = process(JsonFormatInput {
//!     value: r#"{"b":2,"a":1}"#.to_string(),
//!     mode: JsonFormatMode::Pretty,
//!     indent: IndentStyle::Spaces2,
//!     sort_keys: true,
//! });
//! assert!(out.is_valid);
//! assert!(out.result.contains("\"a\""));
//! assert!(out.result.find("\"a\"").lt(&out.result.find("\"b\"")));
//! ```

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Indentation style for Pretty mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IndentStyle {
    /// Two spaces per indent level.
    Spaces2,
    /// Four spaces per indent level.
    Spaces4,
    /// One tab per indent level.
    Tab,
}

/// Input for the JSON formatter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonFormatInput {
    /// Raw JSON string to format.
    pub value: String,
    /// Output format mode.
    pub mode: JsonFormatMode,
    /// Indentation style in Pretty mode.
    pub indent: IndentStyle,
    /// If true, sort object keys alphabetically.
    pub sort_keys: bool,
}

/// Format mode for JSON output.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum JsonFormatMode {
    /// Formatted with indentation.
    Pretty,
    /// Single line, no whitespace.
    Minify,
    /// Single line, minimal spaces after `:` and `,`.
    Compact,
}

/// Output from the JSON formatter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonFormatOutput {
    pub result: String,
    pub is_valid: bool,
    pub line_count: usize,
    pub char_count: usize,
    pub size_bytes: usize,
    pub size_original_bytes: usize,
    pub compression_ratio: Option<f64>,
    pub error: Option<String>,
    pub error_line: Option<usize>,
    pub error_column: Option<usize>,
}

fn default_output(original_len: usize) -> JsonFormatOutput {
    JsonFormatOutput {
        result: String::new(),
        is_valid: false,
        line_count: 0,
        char_count: 0,
        size_bytes: 0,
        size_original_bytes: original_len,
        compression_ratio: None,
        error: None,
        error_line: None,
        error_column: None,
    }
}

fn parse_error_line_column(err: &serde_json::Error) -> (Option<usize>, Option<usize>) {
    let s = err.to_string();
    let mut line = None;
    let mut column = None;
    if let Some(pos) = s.find("line ") {
        let rest = &s[pos + 5..];
        if let Some(end) = rest.find(' ') {
            if let Ok(n) = rest[..end].parse::<usize>() {
                line = Some(n);
            }
        } else if let Ok(n) = rest.trim().parse::<usize>() {
            line = Some(n);
        }
    }
    if let Some(pos) = s.find("column ") {
        let rest = &s[pos + 7..];
        let end = rest.find(|c: char| !c.is_ascii_digit()).unwrap_or(rest.len());
        if let Ok(n) = rest[..end].parse::<usize>() {
            column = Some(n);
        }
    }
    (line, column)
}

pub fn sort_value(v: Value) -> Value {
    match v {
        Value::Object(map) => {
            let mut sorted: Vec<(String, Value)> = map
                .into_iter()
                .map(|(k, v)| (k, sort_value(v)))
                .collect();
            sorted.sort_by(|a, b| a.0.cmp(&b.0));
            Value::Object(sorted.into_iter().collect())
        }
        Value::Array(arr) => {
            Value::Array(arr.into_iter().map(sort_value).collect())
        }
        other => other,
    }
}

fn pretty_with_indent(json: &str, style: IndentStyle) -> String {
    match style {
        IndentStyle::Spaces2 => json.to_string(),
        IndentStyle::Spaces4 => json
            .lines()
            .map(|line| {
                let trimmed = line.trim_start();
                let leading_spaces = line.len() - trimmed.len();
                let level = leading_spaces / 2;
                let new_indent = "    ".repeat(level);
                format!("{}{}", new_indent, trimmed)
            })
            .collect::<Vec<_>>()
            .join("\n"),
        IndentStyle::Tab => json
            .lines()
            .map(|line| {
                let trimmed = line.trim_start();
                let leading_spaces = line.len() - trimmed.len();
                let level = leading_spaces / 2;
                let new_indent = "\t".repeat(level);
                format!("{}{}", new_indent, trimmed)
            })
            .collect::<Vec<_>>()
            .join("\n"),
    }
}

/// Format or minify JSON according to input options.
pub fn process(input: JsonFormatInput) -> JsonFormatOutput {
    let original_len = input.value.len();
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return default_output(original_len);
    }

    let value: Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(e) => {
            let (error_line, error_column) = parse_error_line_column(&e);
            return JsonFormatOutput {
                result: String::new(),
                is_valid: false,
                line_count: 0,
                char_count: 0,
                size_bytes: 0,
                size_original_bytes: original_len,
                compression_ratio: None,
                error: Some(e.to_string()),
                error_line,
                error_column,
            };
        }
    };

    let value = if input.sort_keys {
        sort_value(value)
    } else {
        value
    };

    let result = match input.mode {
        JsonFormatMode::Pretty => {
            let two_space = serde_json::to_string_pretty(&value).unwrap_or_default();
            pretty_with_indent(&two_space, input.indent)
        }
        JsonFormatMode::Minify => serde_json::to_string(&value).unwrap_or_default(),
        JsonFormatMode::Compact => {
            let minified = serde_json::to_string(&value).unwrap_or_default();
            minified
                .replace("\":", "\": ")
                .replace(",", ", ")
        }
    };

    let line_count = result.lines().count();
    let char_count = result.chars().count();
    let size_bytes = result.len();
    let compression_ratio = match input.mode {
        JsonFormatMode::Minify if size_bytes > 0 => {
            Some(original_len as f64 / size_bytes as f64)
        }
        _ => None,
    };

    JsonFormatOutput {
        result: result.clone(),
        is_valid: true,
        line_count,
        char_count,
        size_bytes,
        size_original_bytes: original_len,
        compression_ratio,
        error: None,
        error_line: None,
        error_column: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pretty_format() {
        let out = process(JsonFormatInput {
            value: r#"{"a":1,"b":2}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert!(out.line_count > 1);
        assert!(out.result.contains('\n'));
    }

    #[test]
    fn minify() {
        let out = process(JsonFormatInput {
            value: "{\n  \"a\": 1,\n  \"b\": 2\n}".to_string(),
            mode: JsonFormatMode::Minify,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert_eq!(out.line_count, 1);
        assert!(!out.result.contains("  "));
        assert!(out.compression_ratio.is_some());
        assert!(out.compression_ratio.unwrap() > 1.0);
    }

    #[test]
    fn sort_keys() {
        let out = process(JsonFormatInput {
            value: r#"{"b":1,"a":2}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: true,
        });
        assert!(out.is_valid);
        let a_pos = out.result.find("\"a\"").unwrap();
        let b_pos = out.result.find("\"b\"").unwrap();
        assert!(a_pos < b_pos);
    }

    #[test]
    fn invalid_json() {
        let out = process(JsonFormatInput {
            value: "not json".to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
        assert!(out.error_line.is_some());
    }

    #[test]
    fn empty_input() {
        let out = process(JsonFormatInput {
            value: "".to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(!out.is_valid);
        assert!(out.error.is_none());
        assert_eq!(out.line_count, 0);
    }

    #[test]
    fn nested_sort() {
        let out = process(JsonFormatInput {
            value: r#"{"z":{"y":1,"x":2},"a":3}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: true,
        });
        assert!(out.is_valid);
        assert!(out.result.find("\"a\"").lt(&out.result.find("\"z\"")));
        assert!(out.result.contains("\"x\""));
        assert!(out.result.contains("\"y\""));
    }

    #[test]
    fn indent_4() {
        let out = process(JsonFormatInput {
            value: r#"{"a":1}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces4,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert!(out.result.contains("    \"a\""));
    }

    #[test]
    fn tab_indent() {
        let out = process(JsonFormatInput {
            value: r#"{"a":1,"b":2}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Tab,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert!(out.line_count > 1);
        let first_line = out.result.lines().next().unwrap();
        assert!(first_line.starts_with('{'));
        let second_line = out.result.lines().nth(1).unwrap();
        assert!(
            second_line.starts_with('\t'),
            "expected line to start with tab, got: {:?}",
            second_line
        );
    }

    #[test]
    fn compact_mode() {
        let out = process(JsonFormatInput {
            value: r#"{"a":1,"b":2}"#.to_string(),
            mode: JsonFormatMode::Compact,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert!(out.result.contains(": "));
        assert!(out.result.contains(", "));
        assert_eq!(out.line_count, 1);
    }

    #[test]
    fn unicode() {
        let out = process(JsonFormatInput {
            value: r#"{"name":"日本語","emoji":"🎉"}"#.to_string(),
            mode: JsonFormatMode::Pretty,
            indent: IndentStyle::Spaces2,
            sort_keys: false,
        });
        assert!(out.is_valid);
        assert!(out.result.contains("日本語"));
        assert!(out.result.contains("🎉"));
    }
}
