//! Config file parser supporting .env, .properties, and .ini formats.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum EnvFileFormat {
    /// Auto-detect from content.
    Auto,
    /// KEY=VALUE, # comments, quoted values.
    Env,
    /// KEY=VALUE or KEY: VALUE, # and ! comments, trimmed values.
    Properties,
    /// [Section] headers, KEY=VALUE, # and ; comments.
    Ini,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EnvParseInput {
    pub content: String,
    #[serde(default = "default_format")]
    pub format: EnvFileFormat,
    /// If true, mask values that look like secrets.
    #[serde(default)]
    pub mask_values: bool,
}

fn default_format() -> EnvFileFormat {
    EnvFileFormat::Auto
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EnvEntry {
    pub key: String,
    pub value: String,
    pub raw_value: String,
    pub line_number: u32,
    pub is_empty_value: bool,
    pub is_comment: bool,
    pub is_quoted: bool,
    /// For .ini files: the section this key belongs to. None for .env/.properties.
    pub section: Option<String>,
    /// True if this entry is a section header.
    pub is_section: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EnvIssue {
    pub line_number: u32,
    pub kind: String,
    pub severity: String,
    pub message: String,
    pub key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct EnvParseOutput {
    pub entries: Vec<EnvEntry>,
    pub issues: Vec<EnvIssue>,
    pub total_vars: u32,
    pub empty_vars: u32,
    pub duplicate_keys: Vec<String>,
    /// Entries serialized as JSON object (key -> value, comments/sections/empty excluded).
    pub as_json: String,
    /// Entries normalized to KEY=VALUE format (comments/sections excluded).
    pub normalized_env: String,
    /// The format that was actually used (useful when Auto was selected).
    pub detected_format: EnvFileFormat,
}

// ---------------------------------------------------------------------------
// Auto-detection
// ---------------------------------------------------------------------------

fn detect_format(content: &str) -> EnvFileFormat {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        // .ini: section header
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            return EnvFileFormat::Ini;
        }
        // .ini: semicolon comment
        if trimmed.starts_with(';') {
            return EnvFileFormat::Ini;
        }
        // .properties: exclamation comment
        if trimmed.starts_with('!') {
            return EnvFileFormat::Properties;
        }
        // .properties: colon separator (not followed by // which would be a URL)
        if let Some(colon_pos) = trimmed.find(':') {
            let before = &trimmed[..colon_pos];
            let after = trimmed[colon_pos + 1..].trim_start();
            if !before.contains('=') && !before.contains(' ') && !after.starts_with("//") {
                return EnvFileFormat::Properties;
            }
        }
    }
    EnvFileFormat::Env
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

pub fn process(input: EnvParseInput) -> EnvParseOutput {
    let format = match input.format {
        EnvFileFormat::Auto => detect_format(&input.content),
        f => f,
    };

    match format {
        EnvFileFormat::Ini => parse_ini(&input.content, input.mask_values, format),
        EnvFileFormat::Properties => parse_flat(&input.content, input.mask_values, format, true),
        _ => parse_flat(&input.content, input.mask_values, format, false),
    }
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/// Parse .env and .properties (flat key=value or key: value).
fn parse_flat(
    content: &str,
    mask_values: bool,
    format: EnvFileFormat,
    is_properties: bool,
) -> EnvParseOutput {
    let mut entries = Vec::new();
    let mut issues = Vec::new();
    let mut seen_keys: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut duplicate_keys = std::collections::HashSet::new();

    for (idx, line) in content.lines().enumerate() {
        let line_number = (idx + 1) as u32;
        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        // Comments: # always; ! for .properties
        let is_comment = trimmed.starts_with('#') || (is_properties && trimmed.starts_with('!'));

        if is_comment {
            entries.push(EnvEntry {
                key: trimmed.to_string(),
                value: String::new(),
                raw_value: String::new(),
                line_number,
                is_empty_value: false,
                is_comment: true,
                is_quoted: false,
                section: None,
                is_section: false,
            });
            continue;
        }

        // Strip optional "export " prefix (bash-style) for .env parsing.
        let trimmed = if !is_properties {
            if let Some(rest) = trimmed.strip_prefix("export ") {
                rest.trim_start()
            } else {
                trimmed
            }
        } else {
            trimmed
        };

        // Find separator: = always; : for .properties (only if no = comes first)
        let sep_pos = if is_properties {
            let eq = trimmed.find('=');
            let col = trimmed.find(':').filter(|&p| {
                let after = trimmed[p + 1..].trim_start();
                !after.starts_with("//")
            });
            match (eq, col) {
                (Some(e), Some(c)) => Some(e.min(c)),
                (Some(e), None) => Some(e),
                (None, Some(c)) => Some(c),
                (None, None) => None,
            }
        } else {
            trimmed.find('=')
        };

        if let Some(sep) = sep_pos {
            let key = trimmed[..sep].trim().to_string();
            let raw_value = trimmed[sep + 1..].to_string();
            let raw_value_stripped = strip_inline_comment(&raw_value);

            if key.is_empty() {
                issues.push(EnvIssue {
                    line_number,
                    kind: "invalid_syntax".to_string(),
                    severity: "error".to_string(),
                    message: "Empty key name".to_string(),
                    key: None,
                });
                continue;
            }

            // .env enforces strict key naming; .properties is more permissive
            if !is_properties {
                let valid = key
                    .chars()
                    .next()
                    .map(|c| c.is_alphabetic() || c == '_')
                    .unwrap_or(false)
                    && key.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '.');
                if !valid {
                    issues.push(EnvIssue {
                        line_number,
                        kind: "invalid_syntax".to_string(),
                        severity: "error".to_string(),
                        message: format!("Invalid key name: '{key}'"),
                        key: Some(key.clone()),
                    });
                }
            }

            let (value, is_quoted) = strip_quotes(&raw_value_stripped);
            let value = if is_properties && !is_quoted {
                value.trim().to_string()
            } else {
                value
            };

            let is_empty_value = value.is_empty();
            if is_empty_value {
                issues.push(EnvIssue {
                    line_number,
                    kind: "empty_value".to_string(),
                    severity: "warning".to_string(),
                    message: format!("'{key}' has an empty value"),
                    key: Some(key.clone()),
                });
            }

            if let Some(first_line) = seen_keys.get(&key) {
                issues.push(EnvIssue {
                    line_number,
                    kind: "duplicate_key".to_string(),
                    severity: "warning".to_string(),
                    message: format!("'{key}' is already defined on line {first_line}"),
                    key: Some(key.clone()),
                });
                duplicate_keys.insert(key.clone());
            } else {
                seen_keys.insert(key.clone(), line_number);
            }

            let display_value = if mask_values && looks_like_secret(&key) {
                "••••••••".to_string()
            } else {
                value
            };

            entries.push(EnvEntry {
                key,
                value: display_value,
                raw_value: raw_value_stripped,
                line_number,
                is_empty_value,
                is_comment: false,
                is_quoted,
                section: None,
                is_section: false,
            });
        } else {
            issues.push(EnvIssue {
                line_number,
                kind: "missing_value".to_string(),
                severity: "error".to_string(),
                message: format!("Line {line_number} has no separator ('=' or ':')"),
                key: None,
            });
        }
    }

    let total_vars = entries.iter().filter(|e| !e.is_comment).count() as u32;
    let empty_vars = entries
        .iter()
        .filter(|e| e.is_empty_value && !e.is_comment)
        .count() as u32;

    let json_map: serde_json::Map<String, serde_json::Value> = entries
        .iter()
        .filter(|e| !e.is_comment && !e.is_section && !e.is_empty_value)
        .map(|e| (e.key.clone(), serde_json::Value::String(e.value.clone())))
        .collect();
    let as_json = serde_json::to_string_pretty(&serde_json::Value::Object(json_map))
        .unwrap_or_default();

    let normalized_env = entries
        .iter()
        .filter(|e| !e.is_comment && !e.is_section)
        .map(|e| format!("{}={}", e.key, e.raw_value.trim()))
        .collect::<Vec<_>>()
        .join("\n");

    EnvParseOutput {
        entries,
        issues,
        total_vars,
        empty_vars,
        duplicate_keys: duplicate_keys.into_iter().collect(),
        as_json,
        normalized_env,
        detected_format: format,
    }
}

/// Parse .ini with [section] support.
fn parse_ini(content: &str, mask_values: bool, format: EnvFileFormat) -> EnvParseOutput {
    let mut entries = Vec::new();
    let mut issues = Vec::new();
    let mut seen_keys: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut duplicate_keys = std::collections::HashSet::new();
    let mut current_section: Option<String> = None;

    for (idx, line) in content.lines().enumerate() {
        let line_number = (idx + 1) as u32;
        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        // Comments: # or ;
        if trimmed.starts_with('#') || trimmed.starts_with(';') {
            entries.push(EnvEntry {
                key: trimmed.to_string(),
                value: String::new(),
                raw_value: String::new(),
                line_number,
                is_empty_value: false,
                is_comment: true,
                is_quoted: false,
                section: current_section.clone(),
                is_section: false,
            });
            continue;
        }

        // Section header: [SectionName]
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let section_name = trimmed[1..trimmed.len() - 1].trim().to_string();
            current_section = Some(section_name.clone());
            entries.push(EnvEntry {
                key: section_name,
                value: String::new(),
                raw_value: String::new(),
                line_number,
                is_empty_value: false,
                is_comment: false,
                is_quoted: false,
                section: None,
                is_section: true,
            });
            continue;
        }

        // Key = value (also accept : as separator)
        let sep_pos = trimmed.find('=').or_else(|| trimmed.find(':'));

        if let Some(sep) = sep_pos {
            let key = trimmed[..sep].trim().to_string();
            let raw_value = trimmed[sep + 1..].to_string();

            if key.is_empty() {
                issues.push(EnvIssue {
                    line_number,
                    kind: "invalid_syntax".to_string(),
                    severity: "error".to_string(),
                    message: "Empty key name".to_string(),
                    key: None,
                });
                continue;
            }

            let (value, is_quoted) = strip_quotes(&raw_value);
            let value = if !is_quoted { value.trim().to_string() } else { value };

            let is_empty_value = value.is_empty();
            if is_empty_value {
                issues.push(EnvIssue {
                    line_number,
                    kind: "empty_value".to_string(),
                    severity: "warning".to_string(),
                    message: format!("'{key}' has an empty value"),
                    key: Some(key.clone()),
                });
            }

            // Duplicate detection scoped to section
            let scoped_key = format!(
                "{}::{}",
                current_section.as_deref().unwrap_or(""),
                key
            );
            if let Some(first_line) = seen_keys.get(&scoped_key) {
                issues.push(EnvIssue {
                    line_number,
                    kind: "duplicate_key".to_string(),
                    severity: "warning".to_string(),
                    message: format!(
                        "'{key}' is already defined on line {first_line}{}",
                        current_section
                            .as_deref()
                            .map(|s| format!(" in [{s}]"))
                            .unwrap_or_default()
                    ),
                    key: Some(key.clone()),
                });
                duplicate_keys.insert(key.clone());
            } else {
                seen_keys.insert(scoped_key, line_number);
            }

            let display_value = if mask_values && looks_like_secret(&key) {
                "••••••••".to_string()
            } else {
                value
            };

            entries.push(EnvEntry {
                key,
                value: display_value,
                raw_value,
                line_number,
                is_empty_value,
                is_comment: false,
                is_quoted,
                section: current_section.clone(),
                is_section: false,
            });
        } else {
            issues.push(EnvIssue {
                line_number,
                kind: "missing_value".to_string(),
                severity: "error".to_string(),
                message: format!("Line {line_number} has no '=' or ':' separator"),
                key: None,
            });
        }
    }

    let total_vars = entries
        .iter()
        .filter(|e| !e.is_comment && !e.is_section)
        .count() as u32;
    let empty_vars = entries
        .iter()
        .filter(|e| e.is_empty_value && !e.is_comment && !e.is_section)
        .count() as u32;

    let json_map: serde_json::Map<String, serde_json::Value> = entries
        .iter()
        .filter(|e| !e.is_comment && !e.is_section && !e.is_empty_value)
        .map(|e| (e.key.clone(), serde_json::Value::String(e.value.clone())))
        .collect();
    let as_json = serde_json::to_string_pretty(&serde_json::Value::Object(json_map))
        .unwrap_or_default();

    let normalized_env = entries
        .iter()
        .filter(|e| !e.is_comment && !e.is_section)
        .map(|e| format!("{}={}", e.key, e.raw_value.trim()))
        .collect::<Vec<_>>()
        .join("\n");

    EnvParseOutput {
        entries,
        issues,
        total_vars,
        empty_vars,
        duplicate_keys: duplicate_keys.into_iter().collect(),
        as_json,
        normalized_env,
        detected_format: format,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn strip_quotes(s: &str) -> (String, bool) {
    let trimmed = s.trim();
    if trimmed.len() >= 2
        && ((trimmed.starts_with('"') && trimmed.ends_with('"'))
            || (trimmed.starts_with('\'') && trimmed.ends_with('\'')))
    {
        (trimmed[1..trimmed.len() - 1].to_string(), true)
    } else {
        (trimmed.to_string(), false)
    }
}

/// Remove trailing `# comment` from an unquoted value.
fn strip_inline_comment(s: &str) -> String {
    let t = s.trim();
    if t.starts_with('"') || t.starts_with('\'') {
        return s.to_string();
    }
    if let Some(pos) = t.find(" #").or_else(|| t.find("\t#")) {
        t[..pos].trim_end().to_string()
    } else {
        s.to_string()
    }
}

fn looks_like_secret(key: &str) -> bool {
    let lower = key.to_lowercase();
    let segments: Vec<&str> = lower.split('_').collect();
    let secret_words = [
        "secret",
        "password",
        "passwd",
        "token",
        "apikey",
        "api_key",
        "auth",
        "private",
        "credential",
        "pwd",
        "passphrase",
        "access_key",
        "client_secret",
    ];
    for secret in &secret_words {
        if secret.contains('_') {
            if lower.contains(secret) {
                return true;
            }
        } else if segments.iter().any(|seg| seg == secret) {
            return true;
        }
    }
    false
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_env_file() {
        let out = process(EnvParseInput {
            content: "FOO=bar\nBAR=baz\n# comment".to_string(),
            format: EnvFileFormat::Env,
            mask_values: false,
        });
        assert_eq!(out.total_vars, 2);
        assert_eq!(out.issues.len(), 0);
    }

    #[test]
    fn detects_properties_from_colon_separator() {
        let out = process(EnvParseInput {
            content: "database.host: localhost\ndatabase.port: 5432".to_string(),
            format: EnvFileFormat::Auto,
            mask_values: false,
        });
        assert!(matches!(out.detected_format, EnvFileFormat::Properties));
        assert_eq!(out.total_vars, 2);
    }

    #[test]
    fn detects_ini_from_section_header() {
        let out = process(EnvParseInput {
            content: "[database]\nhost=localhost\nport=5432\n[server]\nport=8080".to_string(),
            format: EnvFileFormat::Auto,
            mask_values: false,
        });
        assert!(matches!(out.detected_format, EnvFileFormat::Ini));
        assert_eq!(out.total_vars, 3);
        let sections: Vec<_> = out.entries.iter().filter(|e| e.is_section).collect();
        assert_eq!(sections.len(), 2);
    }

    #[test]
    fn ini_duplicate_detection_is_scoped_to_section() {
        let out = process(EnvParseInput {
            content: "[a]\nport=80\n[b]\nport=443".to_string(),
            format: EnvFileFormat::Ini,
            mask_values: false,
        });
        assert_eq!(out.duplicate_keys.len(), 0);
    }

    #[test]
    fn detects_duplicate_keys() {
        let out = process(EnvParseInput {
            content: "FOO=1\nBAR=2\nFOO=3".to_string(),
            format: EnvFileFormat::Env,
            mask_values: false,
        });
        assert_eq!(out.duplicate_keys.len(), 1);
        assert!(out.duplicate_keys.contains(&"FOO".to_string()));
    }
}
