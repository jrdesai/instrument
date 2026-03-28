//! JSONPath query tool: apply JSONPath expressions to JSON documents.
//!
//! # Example
//!
//! ```
//! use instrument_core::json::path::{process, JsonPathInput};
//!
//! let out = process(JsonPathInput {
//!     value: r#"{"name":"John"}"#.to_string(),
//!     query: "$.name".to_string(),
//! });
//! assert!(out.is_valid_json);
//! assert!(out.is_valid_query);
//! assert_eq!(out.match_count, 1);
//! assert_eq!(out.matches[0].value, "\"John\"");
//! ```

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::Value;

use jsonpath_rust::{JsonPath, JsonPathValue};

/// Input for the JSONPath tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonPathInput {
    /// JSON document to query.
    pub value: String,
    /// JSONPath expression to apply.
    pub query: String,
}

/// A single JSONPath match.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonPathMatch {
    /// Canonical JSONPath for the matched value, e.g. "$['users'][0]['name']".
    pub path: String,
    /// JSON-serialised matched value.
    pub value: String,
    /// JSON value type: "string", "number", "boolean", "null", "object", "array".
    pub value_type: String,
    /// 0-based match index.
    pub index: u32,
}

/// Output from the JSONPath tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonPathOutput {
    pub is_valid_json: bool,
    pub is_valid_query: bool,
    pub matches: Vec<JsonPathMatch>,
    pub match_count: u32,
    pub error: Option<String>,
    /// Pretty-printed full JSON document (no inline annotations yet).
    pub annotated_document: Option<String>,
}

fn value_type_of(v: &Value) -> &'static str {
    match v {
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Null => "null",
        Value::Object(_) => "object",
        Value::Array(_) => "array",
    }
}

/// Run a JSONPath query against a JSON document.
pub fn process(input: JsonPathInput) -> JsonPathOutput {
    let value_trimmed = input.value.trim();
    let query_trimmed = input.query.trim();

    // Both empty: nothing to do, no error.
    if value_trimmed.is_empty() && query_trimmed.is_empty() {
        return JsonPathOutput {
            is_valid_json: false,
            is_valid_query: false,
            matches: Vec::new(),
            match_count: 0,
            error: None,
            annotated_document: None,
        };
    }

    // Empty JSON but non-empty query: treat as no matches, no error.
    if value_trimmed.is_empty() {
        return JsonPathOutput {
            is_valid_json: false,
            is_valid_query: !query_trimmed.is_empty(),
            matches: Vec::new(),
            match_count: 0,
            error: None,
            annotated_document: None,
        };
    }

    // Parse JSON first.
    let parsed: Value = match serde_json::from_str(value_trimmed) {
        Ok(v) => v,
        Err(e) => {
            return JsonPathOutput {
                is_valid_json: false,
                is_valid_query: false,
                matches: Vec::new(),
                match_count: 0,
                error: Some(e.to_string()),
                annotated_document: None,
            };
        }
    };

    // Empty query with valid JSON: no matches, no error.
    if query_trimmed.is_empty() {
        let annotated = serde_json::to_string_pretty(&parsed).ok();
        return JsonPathOutput {
            is_valid_json: true,
            is_valid_query: false,
            matches: Vec::new(),
            match_count: 0,
            error: None,
            annotated_document: annotated,
        };
    }

    // Apply JSONPath query, capturing both values and paths.
    let path = match JsonPath::<Value>::try_from(query_trimmed) {
        Ok(p) => p,
        Err(e) => {
            let annotated = serde_json::to_string_pretty(&parsed).ok();
            return JsonPathOutput {
                is_valid_json: true,
                is_valid_query: false,
                matches: Vec::new(),
                match_count: 0,
                error: Some(e.to_string()),
                annotated_document: annotated,
            };
        }
    };

    let slice = path.find_slice(&parsed);
    let mut matches = Vec::new();
    for (index, item) in slice.into_iter().enumerate() {
        match item {
            JsonPathValue::Slice(v, path_str) => {
                let value_json = serde_json::to_string(v).unwrap_or_else(|_| "null".to_string());
                let value_type = value_type_of(v).to_string();
                matches.push(JsonPathMatch {
                    path: path_str,
                    value: value_json,
                    value_type,
                    index: u32::try_from(index).unwrap_or(u32::MAX),
                });
            }
            JsonPathValue::NewValue(v) => {
                let value_json = serde_json::to_string(&v).unwrap_or_else(|_| "null".to_string());
                let value_type = value_type_of(&v).to_string();
                matches.push(JsonPathMatch {
                    path: String::new(),
                    value: value_json,
                    value_type,
                    index: u32::try_from(index).unwrap_or(u32::MAX),
                });
            }
            JsonPathValue::NoValue => {
                // skip
            }
        }
    }

    let match_count = u32::try_from(matches.len()).unwrap_or(u32::MAX);
    let annotated_document = serde_json::to_string_pretty(&parsed).ok();

    JsonPathOutput {
        is_valid_json: true,
        is_valid_query: true,
        matches,
        match_count,
        error: None,
        annotated_document,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_key() {
        let out = process(JsonPathInput {
            value: r#"{"name":"John"}"#.to_string(),
            query: "$.name".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 1);
        assert_eq!(out.matches[0].value, "\"John\"");
        assert_eq!(out.matches[0].value_type, "string");
    }

    #[test]
    fn array_wildcard() {
        let out = process(JsonPathInput {
            value: r#"{"users":[{"name":"A"},{"name":"B"}]}"#.to_string(),
            query: "$.users[*].name".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 2);
    }

    #[test]
    fn nested_path() {
        let out = process(JsonPathInput {
            value: r#"{"a":{"b":{"c":42}}}"#.to_string(),
            query: "$.a.b.c".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 1);
        assert_eq!(out.matches[0].value, "42");
        assert_eq!(out.matches[0].value_type, "number");
    }

    #[test]
    fn no_match() {
        let out = process(JsonPathInput {
            value: r#"{"a":1}"#.to_string(),
            query: "$.nonexistent".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn invalid_json() {
        let out = process(JsonPathInput {
            value: "not json".to_string(),
            query: "$.*".to_string(),
        });
        assert!(!out.is_valid_json);
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_query() {
        let out = process(JsonPathInput {
            value: r#"{"name":"John"}"#.to_string(),
            query: "".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(!out.is_valid_query);
        assert_eq!(out.match_count, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn empty_json() {
        let out = process(JsonPathInput {
            value: "".to_string(),
            query: "$.name".to_string(),
        });
        assert!(!out.is_valid_json);
        assert_eq!(out.match_count, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn array_index() {
        let out = process(JsonPathInput {
            value: r#"[1,2,3]"#.to_string(),
            query: "$[0]".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 1);
        assert_eq!(out.matches[0].value, "1");
        assert_eq!(out.matches[0].value_type, "number");
    }

    #[test]
    fn recursive_descent() {
        let out = process(JsonPathInput {
            value: r#"{"a":{"b":1},"c":{"b":2}}"#.to_string(),
            query: "$..b".to_string(),
        });
        assert!(out.is_valid_json);
        assert!(out.is_valid_query);
        assert_eq!(out.match_count, 2);
    }
}

