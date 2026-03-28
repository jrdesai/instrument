//! JSON validator: validate input and report structure summary or errors.
//!
//! # Example
//!
//! ```
//! use instrument_core::json::validator::{process, JsonValidateInput};
//!
//! let out = process(JsonValidateInput {
//!     value: r#"{"a":1,"b":2}"#.to_string(),
//! });
//! assert!(out.is_valid);
//! assert_eq!(out.root_type.as_deref(), Some("object"));
//! ```

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::Value;
use std::collections::HashSet;

/// Input for the JSON validator.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonValidateInput {
    /// Raw JSON string to validate.
    pub value: String,
}

/// Structure statistics collected while walking the value tree.
#[derive(Debug, Default)]
struct Stats {
    depth: usize,
    key_count: usize,
    value_count: usize,
    array_count: usize,
    object_count: usize,
    string_count: usize,
    number_count: usize,
    boolean_count: usize,
    null_count: usize,
    max_array_length: usize,
}

/// Output from the JSON validator.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonValidateOutput {
    pub is_valid: bool,
    pub error: Option<String>,
    pub error_line: Option<u32>,
    pub error_column: Option<u32>,
    pub error_context: Option<String>,
    pub root_type: Option<String>,
    pub depth: Option<u32>,
    pub key_count: Option<u32>,
    pub value_count: Option<u32>,
    pub array_count: Option<u32>,
    pub object_count: Option<u32>,
    pub string_count: Option<u32>,
    pub number_count: Option<u32>,
    pub boolean_count: Option<u32>,
    pub null_count: Option<u32>,
    pub max_array_length: Option<u32>,
    pub has_duplicate_keys: bool,
    pub formatted: Option<String>,
}

fn parse_error_line_column(err: &serde_json::Error) -> (Option<u32>, Option<u32>) {
    let s = err.to_string();
    let mut line = None;
    let mut column = None;
    if let Some(pos) = s.find("line ") {
        let rest = &s[pos + 5..];
        if let Some(end) = rest.find(' ') {
            if let Ok(n) = rest[..end].parse::<u32>() {
                line = Some(n);
            }
        } else if let Ok(n) = rest.trim().parse::<u32>() {
            line = Some(n);
        }
    }
    if let Some(pos) = s.find("column ") {
        let rest = &s[pos + 7..];
        let end = rest.find(|c: char| !c.is_ascii_digit()).unwrap_or(rest.len());
        if let Ok(n) = rest[..end].parse::<u32>() {
            column = Some(n);
        }
    }
    (line, column)
}

fn error_context(input: &str, error_line: u32) -> Option<String> {
    let lines: Vec<&str> = input.lines().collect();
    let line_index = (error_line as usize).checked_sub(1)?;
    let line = lines.get(line_index)?;
    let trimmed = line.trim();
    if trimmed.len() > 80 {
        Some(format!("{}...", trimmed.get(..77).unwrap_or(trimmed)))
    } else {
        Some(trimmed.to_string())
    }
}

fn root_type_name(v: &Value) -> &'static str {
    match v {
        Value::Object(_) => "object",
        Value::Array(_) => "array",
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Null => "null",
    }
}

fn analyse(v: &Value, depth: usize, stats: &mut Stats) {
    stats.depth = stats.depth.max(depth);
    stats.value_count += 1;

    match v {
        Value::Object(map) => {
            stats.object_count += 1;
            stats.key_count += map.len();
            for (_, child) in map {
                analyse(child, depth + 1, stats);
            }
        }
        Value::Array(arr) => {
            stats.array_count += 1;
            stats.max_array_length = stats.max_array_length.max(arr.len());
            for child in arr {
                analyse(child, depth + 1, stats);
            }
        }
        Value::String(_) => stats.string_count += 1,
        Value::Number(_) => stats.number_count += 1,
        Value::Bool(_) => stats.boolean_count += 1,
        Value::Null => stats.null_count += 1,
    }
}

/// Detect duplicate keys in raw JSON by scanning for "key": pattern within object boundaries.
fn has_duplicate_keys_raw(raw: &str) -> bool {
    let mut stack: Vec<HashSet<String>> = vec![];
    let mut i = 0;
    let bytes = raw.as_bytes();
    while i < bytes.len() {
        let c = bytes[i] as char;
        if c == '{' {
            stack.push(HashSet::new());
            i += 1;
            continue;
        }
        if c == '}' {
            stack.pop();
            i += 1;
            continue;
        }
        if c == '"' && !stack.is_empty() {
            // start of string - might be a key
            let start = i + 1;
            i += 1;
            while i < bytes.len() {
                if bytes[i] == b'\\' && i + 1 < bytes.len() {
                    i += 2;
                    continue;
                }
                if bytes[i] == b'"' {
                    break;
                }
                i += 1;
            }
            if i >= bytes.len() {
                break;
            }
            let end = i;
            i += 1;
            // skip whitespace and expect :
            while i < bytes.len() && (bytes[i] == b' ' || bytes[i] == b'\t' || bytes[i] == b'\n') {
                i += 1;
            }
            if i < bytes.len() && bytes[i] == b':' {
                let key = String::from_utf8_lossy(&bytes[start..end]).to_string();
                if let Some(keys) = stack.last_mut() {
                    if !keys.insert(key) {
                        return true;
                    }
                }
            }
            i += 1;
            continue;
        }
        i += 1;
    }
    false
}

/// Validate JSON and return structure summary or error details.
pub fn process(input: JsonValidateInput) -> JsonValidateOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return JsonValidateOutput {
            is_valid: false,
            error: None,
            error_line: None,
            error_column: None,
            error_context: None,
            root_type: None,
            depth: None,
            key_count: None,
            value_count: None,
            array_count: None,
            object_count: None,
            string_count: None,
            number_count: None,
            boolean_count: None,
            null_count: None,
            max_array_length: None,
            has_duplicate_keys: false,
            formatted: None,
        };
    }

    let value: Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(e) => {
            let (error_line, error_column) = parse_error_line_column(&e);
            let error_context = error_line.and_then(|line| error_context(trimmed, line));
            return JsonValidateOutput {
                is_valid: false,
                error: Some(e.to_string()),
                error_line,
                error_column,
                error_context,
                root_type: None,
                depth: None,
                key_count: None,
                value_count: None,
                array_count: None,
                object_count: None,
                string_count: None,
                number_count: None,
                boolean_count: None,
                null_count: None,
                max_array_length: None,
                has_duplicate_keys: false,
                formatted: None,
            };
        }
    };

    let mut stats = Stats::default();
    analyse(&value, 1, &mut stats);

    let root_type = Some(root_type_name(&value).to_string());
    let has_duplicate_keys = has_duplicate_keys_raw(trimmed);
    let formatted = serde_json::to_string_pretty(&value).ok();

    JsonValidateOutput {
        is_valid: true,
        error: None,
        error_line: None,
        error_column: None,
        error_context: None,
        root_type,
        depth: Some(u32::try_from(stats.depth).unwrap_or(u32::MAX)),
        key_count: Some(u32::try_from(stats.key_count).unwrap_or(u32::MAX)),
        value_count: Some(u32::try_from(stats.value_count).unwrap_or(u32::MAX)),
        array_count: Some(u32::try_from(stats.array_count).unwrap_or(u32::MAX)),
        object_count: Some(u32::try_from(stats.object_count).unwrap_or(u32::MAX)),
        string_count: Some(u32::try_from(stats.string_count).unwrap_or(u32::MAX)),
        number_count: Some(u32::try_from(stats.number_count).unwrap_or(u32::MAX)),
        boolean_count: Some(u32::try_from(stats.boolean_count).unwrap_or(u32::MAX)),
        null_count: Some(u32::try_from(stats.null_count).unwrap_or(u32::MAX)),
        max_array_length: Some(u32::try_from(stats.max_array_length).unwrap_or(u32::MAX)),
        has_duplicate_keys,
        formatted,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_object() {
        let out = process(JsonValidateInput {
            value: r#"{"a":1,"b":2}"#.to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.root_type.as_deref(), Some("object"));
    }

    #[test]
    fn valid_array() {
        let out = process(JsonValidateInput {
            value: "[1,2,3]".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.root_type.as_deref(), Some("array"));
        assert_eq!(out.max_array_length, Some(3));
    }

    #[test]
    fn valid_nested() {
        let out = process(JsonValidateInput {
            value: r#"{"a":{"b":{"c":1}}}"#.to_string(),
        });
        assert!(out.is_valid);
        assert!(out.depth.unwrap() >= 3);
    }

    #[test]
    fn invalid_json() {
        let out = process(JsonValidateInput {
            value: "{name: John}".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
        assert!(out.error_line.is_some());
    }

    #[test]
    fn empty_input() {
        let out = process(JsonValidateInput {
            value: "".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_none());
    }

    #[test]
    fn counts_correct() {
        let out = process(JsonValidateInput {
            value: r#"{"name":"John","age":30,"items":[1,2,3]}"#.to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.root_type.as_deref(), Some("object"));
        assert!(out.key_count.unwrap() >= 3);
        assert!(out.string_count.unwrap() >= 1);
        assert!(out.number_count.unwrap() >= 4);
        assert_eq!(out.array_count, Some(1));
        assert_eq!(out.max_array_length, Some(3));
    }

    #[test]
    fn deeply_nested() {
        let out = process(JsonValidateInput {
            value: r#"{"a":{"b":{"c":{"d":{"e":1}}}}}"#.to_string(),
        });
        assert!(out.is_valid);
        // Root + 5 nested objects = depth 6; value 1 is at depth 6
        assert!(out.depth.unwrap() >= 5);
    }

    #[test]
    fn large_array() {
        let arr: String = format!("[{}]", (0..100).map(|i| i.to_string()).collect::<Vec<_>>().join(","));
        let out = process(JsonValidateInput { value: arr });
        assert!(out.is_valid);
        assert_eq!(out.max_array_length, Some(100));
    }
}
