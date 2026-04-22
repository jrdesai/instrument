use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurlHeader {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurlParam {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurlBuildInput {
    pub url: String,
    pub method: String,
    pub headers: Vec<CurlHeader>,
    pub params: Vec<CurlParam>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub auth: Option<String>,
    pub follow_redirects: bool,
    pub insecure: bool,
    pub verbose: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CurlBuildOutput {
    pub command: String,
    pub error: Option<String>,
}

fn sq(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\"'\"'"))
}

pub fn process(input: CurlBuildInput) -> CurlBuildOutput {
    if input.url.trim().is_empty() {
        return CurlBuildOutput { command: String::new(), error: Some("URL is required".to_string()) };
    }
    let mut url = input.url.trim().to_string();
    if !input.params.is_empty() {
        let query = input.params.iter().map(|p| format!("{}={}", p.key, p.value)).collect::<Vec<_>>().join("&");
        url = if url.contains('?') { format!("{url}&{query}") } else { format!("{url}?{query}") };
    }
    let mut parts = vec!["curl".to_string(), "-X".to_string(), input.method.to_uppercase()];
    if input.follow_redirects { parts.push("-L".to_string()); }
    if input.insecure { parts.push("-k".to_string()); }
    if input.verbose { parts.push("-v".to_string()); }
    for h in input.headers {
        parts.push("-H".to_string());
        parts.push(sq(&format!("{}: {}", h.key, h.value)));
    }
    if let Some(ct) = input.content_type {
        parts.push("-H".to_string());
        parts.push(sq(&format!("Content-Type: {ct}")));
    }
    if let Some(auth) = input.auth {
        if let Some(token) = auth.strip_prefix("bearer:") {
            parts.push("-H".to_string());
            parts.push(sq(&format!("Authorization: Bearer {token}")));
        } else if let Some(creds) = auth.strip_prefix("basic:") {
            parts.push("-u".to_string());
            parts.push(sq(creds));
        } else if let Some(key) = auth.strip_prefix("apikey:") {
            parts.push("-H".to_string());
            parts.push(sq(&format!("x-api-key: {key}")));
        }
    }
    if let Some(body) = input.body {
        parts.push("--data".to_string());
        parts.push(sq(&body));
    }
    parts.push(sq(&url));
    let command = parts.join(" ");
    CurlBuildOutput { command, error: None }
}
