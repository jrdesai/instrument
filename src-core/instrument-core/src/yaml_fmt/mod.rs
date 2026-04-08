//! YAML formatter — validates and normalises YAML via serde_yaml round-trip.

use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct YamlFormatInput {
    /// Raw YAML text to format.
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct YamlFormatOutput {
    /// Normalised YAML string.
    pub result: String,
    /// Number of lines in formatted output.
    pub line_count: u32,
    /// Character count.
    pub char_count: u32,
    /// Error message if parsing failed.
    pub error: Option<String>,
}

/// Format (normalise) YAML via parse + re-emit.
pub fn process(input: YamlFormatInput) -> YamlFormatOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return YamlFormatOutput {
            result: String::new(),
            line_count: 0,
            char_count: 0,
            error: None,
        };
    }

    let parsed: Value = match serde_yaml::from_str(trimmed) {
        Ok(v) => v,
        Err(e) => {
            return YamlFormatOutput {
                result: String::new(),
                line_count: 0,
                char_count: 0,
                error: Some(e.to_string()),
            };
        }
    };

    match serde_yaml::to_string(&parsed) {
        Ok(result) => {
            let result = result.trim_start_matches("---\n").to_string();
            let line_count = u32::try_from(result.lines().count()).unwrap_or(u32::MAX);
            let char_count = u32::try_from(result.chars().count()).unwrap_or(u32::MAX);
            YamlFormatOutput {
                result,
                line_count,
                char_count,
                error: None,
            }
        }
        Err(e) => YamlFormatOutput {
            result: String::new(),
            line_count: 0,
            char_count: 0,
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input() {
        let out = process(YamlFormatInput {
            value: String::new(),
        });
        assert_eq!(out.result, "");
        assert!(out.error.is_none());
    }

    #[test]
    fn valid_yaml_normalises() {
        let yaml = "name:   Alice\nage:   30";
        let out = process(YamlFormatInput {
            value: yaml.to_string(),
        });
        assert!(out.error.is_none(), "error: {:?}", out.error);
        assert!(out.result.contains("name: Alice"));
        assert!(out.result.contains("age: 30"));
    }

    #[test]
    fn invalid_yaml_returns_error() {
        let yaml = "name: Alice\n  bad_indent: oops";
        let out = process(YamlFormatInput {
            value: yaml.to_string(),
        });
        assert!(out.error.is_some());
    }
}
