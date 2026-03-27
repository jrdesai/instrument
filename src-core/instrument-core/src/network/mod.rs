//! URL parsing: extract scheme, host, path, query, fragment, and query params.
//!
//! Uses the `url` crate. All parsing happens in Rust; no browser URL API.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use url::Url;

/// Input for the URL parse tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UrlParseInput {
    pub value: String,
}

/// One query string key-value pair (decoded for display).
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct QueryParam {
    pub key: String,
    pub value: String,
}

/// Output from the URL parser.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UrlParseOutput {
    pub scheme: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub path: Option<String>,
    /// Raw query string (as in the URL, not decoded).
    pub query: Option<String>,
    /// Parsed key/value pairs (decoded).
    pub params: Vec<QueryParam>,
    pub fragment: Option<String>,
    /// scheme + host + port when origin is a tuple (opaque origins yield None).
    pub origin: Option<String>,
    pub error: Option<String>,
}

/// Parses the input URL and returns structured components.
pub fn process(input: UrlParseInput) -> UrlParseOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return UrlParseOutput {
            scheme: None,
            username: None,
            password: None,
            host: None,
            port: None,
            path: None,
            query: None,
            params: Vec::new(),
            fragment: None,
            origin: None,
            error: None,
        };
    }

    let parsed = match Url::parse(trimmed) {
        Ok(u) => u,
        Err(e) => {
            return UrlParseOutput {
                scheme: None,
                username: None,
                password: None,
                host: None,
                port: None,
                path: None,
                query: None,
                params: Vec::new(),
                fragment: None,
                origin: None,
                error: Some(e.to_string()),
            };
        }
    };

    let username = if parsed.username().is_empty() {
        None
    } else {
        Some(parsed.username().to_string())
    };
    let password = parsed.password().map(|s| s.to_string());
    let path = if parsed.path().is_empty() {
        None
    } else {
        Some(parsed.path().to_string())
    };
    let params: Vec<QueryParam> = parsed
        .query_pairs()
        .map(|(k, v)| QueryParam {
            key: k.into_owned(),
            value: v.into_owned(),
        })
        .collect();
    let origin = if parsed.origin().is_tuple() {
        Some(parsed.origin().ascii_serialization())
    } else {
        None
    };

    UrlParseOutput {
        scheme: Some(parsed.scheme().to_string()),
        username,
        password,
        host: parsed.host_str().map(|s| s.to_string()),
        port: parsed.port(),
        path,
        query: parsed.query().map(|s| s.to_string()),
        params,
        fragment: parsed.fragment().map(|s| s.to_string()),
        origin,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_url_parses_all_components() {
        let input = UrlParseInput {
            value: "https://user:pass@example.com:8080/path?foo=bar&baz=qux#section".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_none());
        assert_eq!(out.scheme.as_deref(), Some("https"));
        assert_eq!(out.username.as_deref(), Some("user"));
        assert_eq!(out.password.as_deref(), Some("pass"));
        assert_eq!(out.host.as_deref(), Some("example.com"));
        assert_eq!(out.port, Some(8080));
        assert_eq!(out.path.as_deref(), Some("/path"));
        assert_eq!(out.query.as_deref(), Some("foo=bar&baz=qux"));
        assert_eq!(out.params.len(), 2);
        assert_eq!(out.params[0].key, "foo");
        assert_eq!(out.params[0].value, "bar");
        assert_eq!(out.params[1].key, "baz");
        assert_eq!(out.params[1].value, "qux");
        assert_eq!(out.fragment.as_deref(), Some("section"));
        assert_eq!(out.origin.as_deref(), Some("https://example.com:8080"));
    }

    #[test]
    fn url_with_no_port_returns_none_for_port() {
        let input = UrlParseInput {
            value: "https://example.com/".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_none());
        assert_eq!(out.port, None);
        assert_eq!(out.origin.as_deref(), Some("https://example.com"));
    }

    #[test]
    fn url_with_username_password_parses_both() {
        let input = UrlParseInput {
            value: "https://alice:secret@example.com/".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_none());
        assert_eq!(out.username.as_deref(), Some("alice"));
        assert_eq!(out.password.as_deref(), Some("secret"));
    }

    #[test]
    fn fragment_extracted_correctly() {
        let input = UrlParseInput {
            value: "https://example.com/page#anchor".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_none());
        assert_eq!(out.fragment.as_deref(), Some("anchor"));
    }

    #[test]
    fn invalid_url_returns_error_all_other_fields_none() {
        let input = UrlParseInput {
            value: "not a valid url!!!".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_some());
        assert!(out.scheme.is_none());
        assert!(out.host.is_none());
        assert!(out.params.is_empty());
    }

    #[test]
    fn empty_input_returns_all_none_no_error() {
        let input = UrlParseInput {
            value: "   ".to_string(),
        };
        let out = process(input);
        assert!(out.error.is_none());
        assert!(out.scheme.is_none());
        assert!(out.host.is_none());
        assert!(out.params.is_empty());
    }
}
