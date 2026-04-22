use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HttpStatusInput {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HttpStatusEntry {
    pub code: u16,
    pub name: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HttpStatusOutput {
    pub matches: Vec<HttpStatusEntry>,
    pub error: Option<String>,
}

const STATUSES: &[(u16, &str, &str)] = &[
    (100, "Continue", "Request received, continue"),
    (101, "Switching Protocols", "Protocol switch in progress"),
    (103, "Early Hints", "Preload hints before final response"),
    (200, "OK", "The request succeeded"),
    (201, "Created", "Resource created"),
    (204, "No Content", "Success with no response body"),
    (301, "Moved Permanently", "Resource has a new permanent URI"),
    (302, "Found", "Resource temporarily moved"),
    (304, "Not Modified", "Resource not modified"),
    (400, "Bad Request", "Malformed request"),
    (401, "Unauthorized", "Authentication required"),
    (403, "Forbidden", "Access denied"),
    (404, "Not Found", "Resource not found"),
    (405, "Method Not Allowed", "HTTP method not supported"),
    (409, "Conflict", "Request conflict with current state"),
    (410, "Gone", "Resource permanently removed"),
    (418, "I'm a teapot", "RFC 2324 joke status"),
    (429, "Too Many Requests", "Rate limit exceeded"),
    (451, "Unavailable For Legal Reasons", "Blocked for legal reasons"),
    (500, "Internal Server Error", "Generic server failure"),
    (502, "Bad Gateway", "Invalid upstream response"),
    (503, "Service Unavailable", "Server temporarily unavailable"),
    (504, "Gateway Timeout", "Upstream timeout"),
];

fn category(code: u16) -> String {
    match code / 100 {
        1 => "1xx Informational",
        2 => "2xx Success",
        3 => "3xx Redirection",
        4 => "4xx Client Error",
        _ => "5xx Server Error",
    }
    .to_string()
}

pub fn process(input: HttpStatusInput) -> HttpStatusOutput {
    let needle = input.value.trim().to_lowercase();
    if needle.is_empty() {
        return HttpStatusOutput { matches: vec![], error: Some("Value is required".to_string()) };
    }
    let matches = if let Ok(code) = needle.parse::<u16>() {
        STATUSES
            .iter()
            .filter(|(c, _, _)| *c == code)
            .map(|(c, n, d)| HttpStatusEntry { code: *c, name: (*n).to_string(), description: (*d).to_string(), category: category(*c) })
            .collect::<Vec<_>>()
    } else {
        STATUSES
            .iter()
            .filter(|(c, n, d)| format!("{c} {n} {d}").to_lowercase().contains(&needle))
            .map(|(c, n, d)| HttpStatusEntry { code: *c, name: (*n).to_string(), description: (*d).to_string(), category: category(*c) })
            .collect::<Vec<_>>()
    };
    HttpStatusOutput { matches, error: None }
}
