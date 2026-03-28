pub mod to_yaml;
pub mod to_typescript;
pub mod to_csv;
pub mod to_xml;

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ConversionTarget {
    Yaml,
    TypeScript,
    Csv,
    Xml,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonConvertInput {
    pub value: String,
    pub target: ConversionTarget,
    // TypeScript options
    /// Root interface/type name (default: "Root").
    pub ts_root_name: Option<String>,
    /// Prefix interfaces with `export` (default: true).
    pub ts_export: Option<bool>,
    /// Make all fields optional (default: false).
    pub ts_optional_fields: Option<bool>,
    // XML options
    /// Root XML element name (default: "root").
    pub xml_root_element: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonConvertOutput {
    pub result: String,
    pub is_valid_json: bool,
    pub target: ConversionTarget,
    pub error: Option<String>,
    /// Non-fatal warnings about lossy transforms, etc.
    pub warning: Option<String>,
    pub line_count: u32,
    pub char_count: u32,
}

/// Convert JSON to another format (YAML, TypeScript, CSV, XML).
pub fn process(input: JsonConvertInput) -> JsonConvertOutput {
    if input.value.trim().is_empty() {
        return JsonConvertOutput {
            result: String::new(),
            is_valid_json: false,
            target: input.target,
            error: None,
            warning: None,
            line_count: 0,
            char_count: 0,
        };
    }

    let parsed = match serde_json::from_str::<Value>(&input.value) {
        Ok(v) => v,
        Err(e) => {
            return JsonConvertOutput {
                result: String::new(),
                is_valid_json: false,
                target: input.target,
                error: Some(e.to_string()),
                warning: None,
                line_count: 0,
                char_count: 0,
            };
        }
    };

    let (result, warning): (Result<String, String>, Option<String>) = match input.target {
        ConversionTarget::Yaml => (to_yaml::convert(&parsed), None),
        ConversionTarget::TypeScript => (
            to_typescript::convert(
                &parsed,
                input.ts_root_name.as_deref().unwrap_or("Root"),
                input.ts_export.unwrap_or(true),
                input.ts_optional_fields.unwrap_or(false),
            ),
            None,
        ),
        ConversionTarget::Csv => to_csv::convert(&parsed),
        ConversionTarget::Xml => (
            to_xml::convert(
                &parsed,
                input.xml_root_element.as_deref().unwrap_or("root"),
            ),
            None,
        ),
    };

    match result {
        Ok(output) => {
            let line_count = u32::try_from(output.lines().count()).unwrap_or(u32::MAX);
            let char_count = u32::try_from(output.chars().count()).unwrap_or(u32::MAX);
            JsonConvertOutput {
                result: output,
                is_valid_json: true,
                target: input.target,
                error: None,
                warning,
                line_count,
                char_count,
            }
        }
        Err(e) => JsonConvertOutput {
            result: String::new(),
            is_valid_json: true,
            target: input.target,
            error: Some(e.to_string()),
            warning: None,
            line_count: 0,
            char_count: 0,
        },
    }
}

