use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MimeInput {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MimeOutput {
    pub mime_types: Vec<String>,
    pub extensions: Vec<String>,
    pub is_text: bool,
    pub is_binary: bool,
    pub error: Option<String>,
}

pub fn process(input: MimeInput) -> MimeOutput {
    let value = input.value.trim().trim_start_matches('.').to_lowercase();
    if value.is_empty() {
        return MimeOutput { mime_types: vec![], extensions: vec![], is_text: false, is_binary: false, error: Some("Value is required".to_string()) };
    }
    if value.contains('/') {
        let exts = mime_guess::get_mime_extensions_str(&value)
            .map(|v| v.iter().map(|s| s.to_string()).collect::<Vec<_>>())
            .unwrap_or_default();
        let is_text = value.starts_with("text/") || value.contains("json") || value.contains("xml");
        return MimeOutput {
            mime_types: vec![value.clone()],
            extensions: exts,
            is_text,
            is_binary: !is_text,
            error: None,
        };
    }
    let mime_types = mime_guess::from_ext(&value)
        .iter()
        .map(|m| m.essence_str().to_string())
        .collect::<Vec<_>>();
    let is_text = mime_types.iter().any(|m| m.starts_with("text/") || m.contains("json") || m.contains("xml"));
    MimeOutput {
        mime_types,
        extensions: vec![value],
        is_text,
        is_binary: !is_text,
        error: None,
    }
}
