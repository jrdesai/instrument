//! Bidirectional converter between JSON, YAML, and TOML.
//!
//! Uses `serde_json::Value` as the intermediate representation.
//! All six conversion directions are supported.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use ts_rs::TS;

use crate::json::formatter::sort_value;

/// Supported configuration formats.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[ts(export)]
pub enum ConfigFormat {
    Json,
    Yaml,
    Toml,
}

/// Input for the Config Converter tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ConfigConvertInput {
    pub value: String,
    pub from: ConfigFormat,
    pub to: ConfigFormat,
    /// JSON/YAML output indent (2 or 4). Ignored when output is TOML.
    pub indent: u8,
    /// Sort keys alphabetically. Only applies to JSON output.
    pub sort_keys: bool,
}

/// Output from the Config Converter tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ConfigConvertOutput {
    pub result: String,
    pub is_valid_input: bool,
    pub error: Option<String>,
    /// Line number of parse error (1-based), if available.
    pub error_line: Option<u32>,
    /// Column number of parse error (1-based), if available.
    pub error_column: Option<u32>,
    pub line_count: u32,
    pub char_count: u32,
}

fn empty_output(is_valid_input: bool) -> ConfigConvertOutput {
    ConfigConvertOutput {
        result: String::new(),
        is_valid_input,
        error: None,
        error_line: None,
        error_column: None,
        line_count: 0,
        char_count: 0,
    }
}

fn error_output(error: String, line: Option<u32>, col: Option<u32>) -> ConfigConvertOutput {
    ConfigConvertOutput {
        result: String::new(),
        is_valid_input: false,
        error: Some(error),
        error_line: line,
        error_column: col,
        line_count: 0,
        char_count: 0,
    }
}

pub fn process(input: ConfigConvertInput) -> ConfigConvertOutput {
    if input.value.trim().is_empty() {
        return empty_output(true);
    }

    let intermediate = match parse(&input.value, &input.from) {
        Ok(v) => v,
        Err(e) => return e,
    };

    let intermediate = if input.sort_keys && input.to == ConfigFormat::Json {
        sort_value(intermediate)
    } else {
        intermediate
    };

    match serialize(&intermediate, &input.to, input.indent) {
        Ok(result) => {
            let line_count = u32::try_from(result.lines().count()).unwrap_or(u32::MAX);
            let char_count = u32::try_from(result.chars().count()).unwrap_or(u32::MAX);
            ConfigConvertOutput {
                result,
                is_valid_input: true,
                error: None,
                error_line: None,
                error_column: None,
                line_count,
                char_count,
            }
        }
        Err(msg) => error_output(msg, None, None),
    }
}

fn parse(value: &str, format: &ConfigFormat) -> Result<Value, ConfigConvertOutput> {
    match format {
        ConfigFormat::Json => parse_json(value),
        ConfigFormat::Yaml => parse_yaml(value),
        ConfigFormat::Toml => parse_toml(value),
    }
}

fn parse_json(value: &str) -> Result<Value, ConfigConvertOutput> {
    serde_json::from_str(value).map_err(|e| error_output(format!("Invalid JSON: {e}"), None, None))
}

fn parse_yaml(value: &str) -> Result<Value, ConfigConvertOutput> {
    serde_yaml::from_str(value).map_err(|e| {
        let (line, col) = yaml_error_location(&e);
        error_output(e.to_string(), line, col)
    })
}

fn yaml_error_location(e: &serde_yaml::Error) -> (Option<u32>, Option<u32>) {
    (
        e.location().and_then(|l| u32::try_from(l.line()).ok()),
        e.location().and_then(|l| u32::try_from(l.column()).ok()),
    )
}

fn parse_toml(value: &str) -> Result<Value, ConfigConvertOutput> {
    let toml_val: toml::Value =
        toml::from_str(value).map_err(|e| error_output(e.to_string(), None, None))?;
    serde_json::to_value(&toml_val)
        .map_err(|e| error_output(format!("TOML→internal conversion failed: {e}"), None, None))
}

fn serialize(value: &Value, format: &ConfigFormat, indent: u8) -> Result<String, String> {
    match format {
        ConfigFormat::Json => serialize_json(value, indent),
        ConfigFormat::Yaml => serialize_yaml(value),
        ConfigFormat::Toml => serialize_toml(value),
    }
}

fn serialize_json(value: &Value, indent: u8) -> Result<String, String> {
    let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;

    if indent == 4 {
        Ok(json
            .lines()
            .map(|line| {
                let trimmed = line.trim_start();
                let level = (line.len() - trimmed.len()) / 2;
                format!("{}{}", "    ".repeat(level), trimmed)
            })
            .collect::<Vec<_>>()
            .join("\n"))
    } else {
        Ok(json)
    }
}

fn serialize_yaml(value: &Value) -> Result<String, String> {
    serde_yaml::to_string(value).map_err(|e| e.to_string())
}

fn serialize_toml(value: &Value) -> Result<String, String> {
    let toml_val: toml::Value =
        serde_json::from_value(value.clone()).map_err(|e| format!("Cannot represent as TOML: {e}"))?;
    toml::to_string_pretty(&toml_val).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(value: &str, from: ConfigFormat, to: ConfigFormat) -> ConfigConvertInput {
        ConfigConvertInput {
            value: value.to_string(),
            from,
            to,
            indent: 2,
            sort_keys: false,
        }
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = process(input("", ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.error.is_none());
        assert!(out.result.is_empty());
        assert!(out.is_valid_input);
    }

    #[test]
    fn yaml_to_json_simple() {
        let out = process(input("name: Alice\nage: 30\n", ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.error.is_none());
        assert!(out.result.contains("\"Alice\""));
        assert!(out.result.contains("30"));
    }

    #[test]
    fn yaml_to_json_nested() {
        let yaml = "user:\n  name: Bob\n  roles:\n    - admin\n";
        let out = process(input(yaml, ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.error.is_none());
        assert!(out.result.contains("\"user\""));
        assert!(out.result.contains("\"roles\""));
    }

    #[test]
    fn yaml_to_json_anchors() {
        let yaml = "base: &base\n  color: red\nitem:\n  <<: *base\n  name: test\n";
        let out = process(input(yaml, ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.error.is_none());
        assert!(out.result.contains("\"color\""));
    }

    #[test]
    fn yaml_to_json_invalid() {
        let out = process(input("{{invalid", ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.error.is_some());
        assert!(!out.is_valid_input);
    }

    #[test]
    fn json_to_yaml_simple() {
        let out = process(input(
            r#"{"name":"Alice","age":30}"#,
            ConfigFormat::Json,
            ConfigFormat::Yaml,
        ));
        assert!(out.error.is_none());
        assert!(out.result.contains("Alice"));
    }

    #[test]
    fn json_to_yaml_invalid() {
        let out = process(input("{not json}", ConfigFormat::Json, ConfigFormat::Yaml));
        assert!(out.error.is_some());
    }

    #[test]
    fn toml_to_json_simple() {
        let out = process(input(
            "name = \"Alice\"\nage = 30\n",
            ConfigFormat::Toml,
            ConfigFormat::Json,
        ));
        assert!(out.error.is_none());
        assert!(out.result.contains("\"Alice\""));
    }

    #[test]
    fn toml_to_json_table() {
        let toml = "[server]\nport = 8080\nhost = \"localhost\"\n";
        let out = process(input(toml, ConfigFormat::Toml, ConfigFormat::Json));
        assert!(out.error.is_none());
        assert!(out.result.contains("8080"));
    }

    #[test]
    fn toml_to_json_invalid() {
        let out = process(input("this === invalid", ConfigFormat::Toml, ConfigFormat::Json));
        assert!(out.error.is_some());
    }

    #[test]
    fn json_to_toml_simple() {
        let out = process(input(
            r#"{"name":"Bob","age":25}"#,
            ConfigFormat::Json,
            ConfigFormat::Toml,
        ));
        assert!(out.error.is_none());
        assert!(out.result.contains("Bob"));
    }

    #[test]
    fn json_to_toml_nested() {
        let out = process(input(
            r#"{"server":{"port":8080}}"#,
            ConfigFormat::Json,
            ConfigFormat::Toml,
        ));
        assert!(out.error.is_none());
        assert!(out.result.contains("port"));
        assert!(out.result.contains("8080"));
    }

    #[test]
    fn yaml_to_toml() {
        let yaml = "name: Alice\nage: 30\n";
        let out = process(input(yaml, ConfigFormat::Yaml, ConfigFormat::Toml));
        assert!(out.error.is_none());
        assert!(out.result.contains("Alice"));
    }

    #[test]
    fn toml_to_yaml() {
        let toml = "name = \"Alice\"\nage = 30\n";
        let out = process(input(toml, ConfigFormat::Toml, ConfigFormat::Yaml));
        assert!(out.error.is_none());
        assert!(out.result.contains("Alice"));
    }

    #[test]
    fn sort_keys_json_output() {
        let yaml = "z: 1\na: 2\nm: 3\n";
        let out = process(ConfigConvertInput {
            sort_keys: true,
            ..input(yaml, ConfigFormat::Yaml, ConfigFormat::Json)
        });
        assert!(out.error.is_none());
        let a = out.result.find("\"a\"").unwrap();
        let m = out.result.find("\"m\"").unwrap();
        let z = out.result.find("\"z\"").unwrap();
        assert!(a < m && m < z);
    }

    #[test]
    fn indent_4_json_output() {
        let yaml = "server:\n  port: 8080\n";
        let out = process(ConfigConvertInput {
            indent: 4,
            ..input(yaml, ConfigFormat::Yaml, ConfigFormat::Json)
        });
        assert!(out.error.is_none());
        assert!(out.result.lines().any(|l| l.starts_with("    ")));
    }

    #[test]
    fn round_trip_json_yaml_json() {
        let original = r#"{"name":"Alice","age":30}"#;
        let to_yaml = process(input(original, ConfigFormat::Json, ConfigFormat::Yaml));
        assert!(to_yaml.error.is_none());
        let back = process(input(&to_yaml.result, ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(back.error.is_none());
        assert!(back.result.contains("\"Alice\""));
    }

    #[test]
    fn line_char_count_populated() {
        let out = process(input("name: Alice\n", ConfigFormat::Yaml, ConfigFormat::Json));
        assert!(out.line_count > 0);
        assert!(out.char_count > 0);
    }
}
