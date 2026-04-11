//! User-Agent string parser.
//!
//! Uses the `woothee` crate for browser, OS, vendor, and category detection,
//! then augments the result with a lightweight rendering engine heuristic.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use woothee::parser::Parser;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UaParseInput {
    pub ua: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UaParseOutput {
    /// Browser name, e.g. "Chrome", "Firefox", "Safari".
    pub browser_name: Option<String>,
    /// Browser version string, e.g. "120.0.0.0".
    pub browser_version: Option<String>,
    /// Operating system name, e.g. "Mac OSX", "Windows", "iOS".
    pub os: Option<String>,
    /// OS version string if available.
    pub os_version: Option<String>,
    /// High-level device classification: "Desktop", "Mobile", "Tablet", "Bot", "Other", "Unknown".
    pub device_type: String,
    /// Rendering engine: "Blink", "Gecko", "WebKit", "Trident", "EdgeHTML", or "Presto".
    pub engine: Option<String>,
    /// True when the UA belongs to a crawler, bot, or spider.
    pub is_bot: bool,
    /// Hardware vendor if detectable (e.g. "Apple", "Samsung").
    pub vendor: Option<String>,
    /// Raw woothee category string for reference ("pc", "smartphone", "crawler", etc.).
    pub category: String,
    pub error: Option<String>,
}

fn none_if_empty(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "UNKNOWN" {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// Detect the rendering engine from the raw User-Agent string.
fn detect_engine(ua: &str) -> Option<String> {
    // Order matters because some engines intentionally include compatibility tokens.
    if ua.contains("Trident") || ua.contains("MSIE") {
        Some("Trident".to_string())
    } else if ua.contains("Edge/") {
        Some("EdgeHTML".to_string())
    } else if ua.contains("Presto") {
        Some("Presto".to_string())
    } else if ua.contains("Gecko/") || ua.contains("Firefox/") {
        Some("Gecko".to_string())
    } else if ua.contains("AppleWebKit")
        && (ua.contains("Chrome/")
            || ua.contains("Chromium/")
            || ua.contains("Edg/")
            || ua.contains("OPR/"))
    {
        Some("Blink".to_string())
    } else if ua.contains("AppleWebKit") {
        Some("WebKit".to_string())
    } else {
        None
    }
}

/// Map the parser category to a user-friendly device classification.
fn map_device_type(category: &str, os: Option<&str>, ua: &str) -> String {
    match category {
        "pc" => "Desktop".to_string(),
        "smartphone" | "mobilephone" => "Mobile".to_string(),
        "crawler" => "Bot".to_string(),
        "misc" => "Other".to_string(),
        "appliance" => {
            if ua.contains("iPad")
                || ua.contains("Tablet")
                || os.is_some_and(|value| value.contains("Android"))
            {
                "Tablet".to_string()
            } else {
                "Smart Device".to_string()
            }
        }
        _ => "Unknown".to_string(),
    }
}

/// Parse a User-Agent string into structured browser, OS, and device details.
pub fn process(input: UaParseInput) -> UaParseOutput {
    let ua = input.ua.trim();
    if ua.is_empty() {
        return UaParseOutput {
            browser_name: None,
            browser_version: None,
            os: None,
            os_version: None,
            device_type: "Unknown".to_string(),
            engine: None,
            is_bot: false,
            vendor: None,
            category: String::new(),
            error: None,
        };
    }

    let parser = Parser::new();
    match parser.parse(ua) {
        Some(result) => {
            let category = result.category;
            let os = none_if_empty(result.os);

            UaParseOutput {
                browser_name: none_if_empty(result.name),
                browser_version: none_if_empty(result.version),
                os_version: none_if_empty(&result.os_version),
                device_type: map_device_type(category, os.as_deref(), ua),
                engine: detect_engine(ua),
                is_bot: category == "crawler",
                vendor: none_if_empty(result.vendor),
                category: category.to_string(),
                os,
                error: None,
            }
        }
        None => UaParseOutput {
            browser_name: None,
            browser_version: None,
            os: None,
            os_version: None,
            device_type: "Unknown".to_string(),
            engine: detect_engine(ua),
            is_bot: false,
            vendor: None,
            category: String::new(),
            error: Some("Could not parse User-Agent string".to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(ua: &str) -> UaParseOutput {
        process(UaParseInput { ua: ua.to_string() })
    }

    #[test]
    fn parses_chrome_desktop_user_agent() {
        let out = parse(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
             (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        );

        assert_eq!(out.browser_name.as_deref(), Some("Chrome"));
        assert_eq!(out.device_type, "Desktop");
        assert_eq!(out.engine.as_deref(), Some("Blink"));
        assert!(!out.is_bot);
        assert!(out.error.is_none());
    }

    #[test]
    fn parses_firefox_desktop_user_agent() {
        let out = parse(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        );

        assert_eq!(out.browser_name.as_deref(), Some("Firefox"));
        assert_eq!(out.engine.as_deref(), Some("Gecko"));
        assert_eq!(out.device_type, "Desktop");
    }

    #[test]
    fn parses_ios_safari_user_agent() {
        let out = parse(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 \
             (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        );

        assert_eq!(out.browser_name.as_deref(), Some("Safari"));
        assert_eq!(out.device_type, "Mobile");
        assert_eq!(out.engine.as_deref(), Some("WebKit"));
    }

    #[test]
    fn detects_googlebot_as_bot() {
        let out = parse("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

        assert!(out.is_bot);
        assert_eq!(out.device_type, "Bot");
    }

    #[test]
    fn parses_curl_user_agent() {
        let out = parse("curl/7.88.1");

        assert_eq!(out.browser_name.as_deref(), Some("HTTP Library"));
        assert!(out.error.is_none());
    }

    #[test]
    fn detects_legacy_edgehtml_engine() {
        let out = parse(
            "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) \
             Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
        );

        assert_eq!(out.engine.as_deref(), Some("EdgeHTML"));
    }

    #[test]
    fn empty_input_returns_unknown_without_error() {
        let out = parse("   ");

        assert_eq!(out.device_type, "Unknown");
        assert!(out.error.is_none());
    }
}
