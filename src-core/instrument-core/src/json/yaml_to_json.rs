//! YAML to JSON converter: parse YAML and emit formatted JSON.
//!
//! # Example
//!
//! ```
//! use instrument_core::json::yaml_to_json::{process, YamlToJsonInput};
//!
//! let out = process(YamlToJsonInput {
//!     value: "name: John".to_string(),
//!     indent: 2,
//!     sort_keys: false,
//! });
//! assert!(out.is_valid_yaml);
//! assert!(out.result.contains("\"name\""));
//! ```

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::Value;

use crate::json::formatter::sort_value;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct YamlToJsonInput {
    pub value: String,
    pub indent: u8,
    pub sort_keys: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct YamlToJsonOutput {
    pub result: String,
    pub is_valid_yaml: bool,
    pub error: Option<String>,
    pub error_line: Option<u32>,
    pub error_column: Option<u32>,
    pub line_count: u32,
    pub char_count: u32,
}

fn default_output() -> YamlToJsonOutput {
    YamlToJsonOutput {
        result: String::new(),
        is_valid_yaml: false,
        error: None,
        error_line: None,
        error_column: None,
        line_count: 0,
        char_count: 0,
    }
}

fn parse_error_line_column(err: &serde_yaml::Error) -> (Option<u32>, Option<u32>) {
    (
        err
            .location()
            .and_then(|l| u32::try_from(l.line()).ok()),
        err
            .location()
            .and_then(|l| u32::try_from(l.column()).ok()),
    )
}

/// Convert YAML input to formatted JSON.
pub fn process(input: YamlToJsonInput) -> YamlToJsonOutput {
    if input.value.trim().is_empty() {
        return default_output();
    }

    let parsed: Value = match serde_yaml::from_str(&input.value) {
        Ok(v) => v,
        Err(e) => {
            let (line, column) = parse_error_line_column(&e);
            return YamlToJsonOutput {
                result: String::new(),
                is_valid_yaml: false,
                error: Some(e.to_string()),
                error_line: line,
                error_column: column,
                ..default_output()
            };
        }
    };

    let value = if input.sort_keys {
        sort_value(parsed)
    } else {
        parsed
    };

    let mut json = match serde_json::to_string_pretty(&value) {
        Ok(s) => s,
        Err(e) => {
            return YamlToJsonOutput {
                result: String::new(),
                is_valid_yaml: true,
                error: Some(e.to_string()),
                ..default_output()
            };
        }
    };

    if input.indent == 4 {
        json = json
            .lines()
            .map(|line| {
                let trimmed = line.trim_start();
                let leading_spaces = line.len() - trimmed.len();
                let level = leading_spaces / 2;
                format!("{}{}", "    ".repeat(level), trimmed)
            })
            .collect::<Vec<_>>()
            .join("\n");
    }

    let line_count = u32::try_from(json.lines().count()).unwrap_or(u32::MAX);
    let char_count = u32::try_from(json.chars().count()).unwrap_or(u32::MAX);

    YamlToJsonOutput {
        result: json,
        is_valid_yaml: true,
        error: None,
        error_line: None,
        error_column: None,
        line_count,
        char_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_object() {
        let out = process(YamlToJsonInput {
            value: "name: John\nage: 30\nactive: true\n".to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.error.is_none());
        assert!(out.result.contains("\"name\""));
        assert!(out.result.contains("\"John\""));
        assert!(out.result.contains("\"age\""));
    }

    #[test]
    fn multiline_string() {
        let yaml = "bio: |\n  Line one\n  Line two\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.result.contains("Line one\\nLine two"));
    }

    #[test]
    fn yaml_array() {
        let yaml = "- 1\n- 2\n- 3\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.result.starts_with("["));
    }

    #[test]
    fn nested() {
        let yaml = "user:\n  name: John\n  roles:\n    - admin\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.result.contains("\"user\""));
        assert!(out.result.contains("\"roles\""));
    }

    #[test]
    fn invalid_yaml() {
        let out = process(YamlToJsonInput {
            value: "{{invalid".to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(!out.is_valid_yaml);
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_input() {
        let out = process(YamlToJsonInput {
            value: "".to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(!out.is_valid_yaml);
        assert!(out.error.is_none());
        assert_eq!(out.line_count, 0);
    }

    #[test]
    fn sort_keys() {
        let yaml = "b: 1\na: 2\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: true,
        });
        assert!(out.is_valid_yaml);
        let a_pos = out.result.find("\"a\"").unwrap();
        let b_pos = out.result.find("\"b\"").unwrap();
        assert!(a_pos < b_pos);
    }

    #[test]
    fn indent_4() {
        let yaml = "a: 1\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 4,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.result.contains("    \"a\""));
    }

    #[test]
    fn yaml_anchors() {
        let yaml = "defaults: &defaults\n  color: red\nitem:\n  <<: *defaults\n  name: test\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        assert!(out.result.contains("\"defaults\""));
        assert!(out.result.contains("\"color\""));
        assert!(out.result.contains("\"item\""));
        assert!(out.result.contains("\"name\""));
    }

    #[test]
    fn yaml_types() {
        let yaml = "a: true\nb: yes\nc: on\nd: ~\n";
        let out = process(YamlToJsonInput {
            value: yaml.to_string(),
            indent: 2,
            sort_keys: false,
        });
        assert!(out.is_valid_yaml);
        // a: true stays true
        assert!(out.result.contains("\"a\": true"));
        // Depending on serde_yaml configuration, yes/on may be treated as string or bool.
        // We only assert that they are present in the output.
        assert!(out.result.contains("\"b\":"));
        assert!(out.result.contains("\"c\":"));
        // ~ -> null
        assert!(out.result.contains("\"d\": null"));
    }
}

