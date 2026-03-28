use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RegexRequest {
    pub pattern: String,
    pub text: String,
    pub engine: String,
    pub flags: Option<String>,
}

#[derive(Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MatchResult {
    pub start: u32,
    pub end: u32,
    pub value: String,
    pub groups: Vec<Option<String>>,
}

#[derive(Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplainToken {
    pub kind: String,
    pub label: String,
    pub description: String,
    pub depth: u32,
}

#[derive(Debug, Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExplainRequest {
    pub pattern: String,
    pub engine: String,
}
