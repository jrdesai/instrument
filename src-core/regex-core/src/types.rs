use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct RegexRequest {
    pub pattern: String,
    pub text: String,
    pub engine: String,
    pub flags: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MatchResult {
    pub start: usize,
    pub end: usize,
    pub value: String,
    pub groups: Vec<Option<String>>,
}

#[derive(Debug, Serialize)]
pub struct ExplainToken {
    pub kind: String,
    pub label: String,
    pub description: String,
    pub depth: usize,
}

#[derive(Debug, Deserialize)]
pub struct ExplainRequest {
    pub pattern: String,
    pub engine: String,
}

