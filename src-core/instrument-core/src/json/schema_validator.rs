//! JSON Schema Validator — validates a JSON document against a JSON Schema.
//!
//! Supports drafts 7, 2019-09, and 2020-12 via the `jsonschema` crate.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use ts_rs::TS;

/// A single validation issue (one schema violation).
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ValidationIssue {
    /// JSON Pointer path to the failing instance node (e.g. "/user/age").
    pub instance_path: String,
    /// Human-readable error message.
    pub message: String,
    /// JSON Pointer path into the schema that produced the error.
    pub schema_path: String,
}

/// Which JSON Schema draft to use for validation.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, TS, Type)]
#[ts(export)]
pub enum SchemaDraft {
    #[serde(rename = "draft7")]
    Draft7,
    #[serde(rename = "2019-09")]
    Draft2019,
    #[serde(rename = "2020-12")]
    Draft2020,
}

impl Default for SchemaDraft {
    fn default() -> Self {
        Self::Draft7
    }
}

/// Input for JSON Schema validation.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonSchemaValidateInput {
    /// The JSON document to validate (raw string).
    pub document: String,
    /// The JSON Schema to validate against (raw string).
    pub schema: String,
    /// Which schema draft to use (defaults to draft7).
    #[serde(default)]
    pub draft: SchemaDraft,
}

/// Output from JSON Schema validation.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonSchemaValidateOutput {
    /// Whether the document is valid against the schema.
    pub valid: bool,
    /// Total number of validation errors.
    pub error_count: u32,
    /// List of individual validation issues.
    pub issues: Vec<ValidationIssue>,
    /// Set when the document or schema itself is not valid JSON.
    pub parse_error: Option<String>,
}

/// Validate a JSON document against a JSON Schema.
pub fn process(input: JsonSchemaValidateInput) -> JsonSchemaValidateOutput {
    let document_str = input.document.trim();
    let schema_str = input.schema.trim();

    if document_str.is_empty() && schema_str.is_empty() {
        return JsonSchemaValidateOutput {
            valid: false,
            error_count: 0,
            issues: vec![],
            parse_error: None,
        };
    }

    let schema_value: Value = match serde_json::from_str(schema_str) {
        Ok(v) => v,
        Err(e) => {
            return JsonSchemaValidateOutput {
                valid: false,
                error_count: 0,
                issues: vec![],
                parse_error: Some(format!("Schema parse error: {}", e)),
            };
        }
    };

    let document_value: Value = match serde_json::from_str(document_str) {
        Ok(v) => v,
        Err(e) => {
            return JsonSchemaValidateOutput {
                valid: false,
                error_count: 0,
                issues: vec![],
                parse_error: Some(format!("Document parse error: {}", e)),
            };
        }
    };

    let draft = match input.draft {
        SchemaDraft::Draft7 => jsonschema::Draft::Draft7,
        SchemaDraft::Draft2019 => jsonschema::Draft::Draft201909,
        SchemaDraft::Draft2020 => jsonschema::Draft::Draft202012,
    };

    let compiled = match jsonschema::JSONSchema::options()
        .with_draft(draft)
        .compile(&schema_value)
    {
        Ok(c) => c,
        Err(e) => {
            return JsonSchemaValidateOutput {
                valid: false,
                error_count: 0,
                issues: vec![],
                parse_error: Some(format!("Schema compile error: {}", e)),
            };
        }
    };

    let errors: Vec<ValidationIssue> = match compiled.validate(&document_value) {
        Ok(()) => vec![],
        Err(iter) => iter
            .map(|e| ValidationIssue {
                instance_path: e.instance_path.to_string(),
                message: e.to_string(),
                schema_path: e.schema_path.to_string(),
            })
            .collect(),
    };

    let error_count = errors.len() as u32;
    let valid = errors.is_empty();

    JsonSchemaValidateOutput {
        valid,
        error_count,
        issues: errors,
        parse_error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_document() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer","minimum":0}},"required":["name"]}"#
                .into(),
            document: r#"{"name":"Alice","age":30}"#.into(),
            draft: SchemaDraft::Draft7,
        });
        assert!(out.valid);
        assert_eq!(out.error_count, 0);
        assert!(out.parse_error.is_none());
    }

    #[test]
    fn missing_required_field() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}"#
                .into(),
            document: r#"{"age":30}"#.into(),
            draft: SchemaDraft::Draft7,
        });
        assert!(!out.valid);
        assert!(out.error_count > 0);
    }

    #[test]
    fn wrong_type() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{"type":"object","properties":{"age":{"type":"integer"}}}"#.into(),
            document: r#"{"age":"not-a-number"}"#.into(),
            draft: SchemaDraft::Draft7,
        });
        assert!(!out.valid);
        assert!(out.error_count > 0);
    }

    #[test]
    fn invalid_document_json() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{"type":"object"}"#.into(),
            document: r#"{invalid}"#.into(),
            draft: SchemaDraft::Draft7,
        });
        assert!(!out.valid);
        assert!(out.parse_error.is_some());
        assert!(out.parse_error.as_deref().unwrap().contains("Document"));
    }

    #[test]
    fn invalid_schema_json() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{bad schema"#.into(),
            document: r#"{"ok":true}"#.into(),
            draft: SchemaDraft::Draft7,
        });
        assert!(!out.valid);
        assert!(out.parse_error.is_some());
        assert!(out.parse_error.as_deref().unwrap().contains("Schema"));
    }

    #[test]
    fn empty_inputs() {
        let out = process(JsonSchemaValidateInput {
            schema: "".into(),
            document: "".into(),
            draft: SchemaDraft::default(),
        });
        assert!(!out.valid);
        assert!(out.parse_error.is_none());
    }

    #[test]
    fn draft_2020() {
        let out = process(JsonSchemaValidateInput {
            schema: r#"{"type":"array","items":{"type":"number"}}"#.into(),
            document: r#"[1,2,3]"#.into(),
            draft: SchemaDraft::Draft2020,
        });
        assert!(out.valid);
    }
}
