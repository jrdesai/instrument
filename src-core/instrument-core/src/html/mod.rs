//! HTML formatter — pretty-prints HTML via [markup_fmt](https://crates.io/crates/markup_fmt).

use markup_fmt::config::{FormatOptions, LanguageOptions, LayoutOptions};
use markup_fmt::{format_text, Language};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::borrow::Cow;
use std::num::NonZeroUsize;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HtmlFormatInput {
    /// Raw HTML to format.
    pub code: String,
    /// Spaces per indent level, or `0` for tabs.
    pub indent_size: u8,
    /// Prefer each attribute on its own line when a tag has multiple attributes.
    pub wrap_attributes: bool,
    /// Soft wrap width (used by the formatter layout engine; strongest effect with wrap attributes on).
    pub print_width: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct HtmlFormatOutput {
    pub formatted: String,
    pub error: Option<String>,
}

pub fn process(input: HtmlFormatInput) -> HtmlFormatOutput {
    let trimmed = input.code.trim();
    if trimmed.is_empty() {
        return HtmlFormatOutput {
            formatted: String::new(),
            error: None,
        };
    }

    let print_width = input.print_width.clamp(40, 200) as usize;

    // `tiny_pretty` maps logical indent columns to `\t` using `tab_size` (= `indent_width` here).
    let (use_tabs, indent_width) = if input.indent_size == 0 {
        (true, 4usize)
    } else {
        (false, input.indent_size.clamp(1, 8) as usize)
    };

    // `prefer_attrs_single_line` keeps multiple attributes on one line when they fit;
    // disabling it plus `max_attrs_per_line: 1` matches “wrap attributes” in the UI.
    let mut language = LanguageOptions::default();
    language.prefer_attrs_single_line = !input.wrap_attributes;
    language.max_attrs_per_line = if input.wrap_attributes {
        NonZeroUsize::new(1)
    } else {
        None
    };

    let options = FormatOptions {
        layout: LayoutOptions {
            print_width,
            use_tabs,
            indent_width,
            ..LayoutOptions::default()
        },
        language,
    };

    match format_text(trimmed, Language::Html, &options, |code, _| {
        Ok::<_, std::convert::Infallible>(Cow::Borrowed(code))
    }) {
        Ok(s) => HtmlFormatOutput {
            formatted: s,
            error: None,
        },
        Err(e) => HtmlFormatOutput {
            formatted: String::new(),
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(code: &str) -> HtmlFormatInput {
        HtmlFormatInput {
            code: code.to_string(),
            indent_size: 2,
            wrap_attributes: false,
            print_width: 80,
        }
    }

    #[test]
    fn formats_simple_html() {
        let out = process(input("<div><p>Hello</p></div>"));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert!(out.formatted.contains('\n'));
    }

    #[test]
    fn handles_empty_input() {
        let out = process(input(""));
        assert!(out.error.is_none());
        assert_eq!(out.formatted, "");
    }

    #[test]
    fn formats_full_document() {
        let html = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hi</h1></body></html>";
        let out = process(input(html));
        assert!(out.error.is_none(), "{:?}", out.error);
        assert!(out.formatted.contains("<!DOCTYPE html>"));
        assert!(out.formatted.contains("<title>"));
    }

    #[test]
    fn tab_indent() {
        // Narrow print width forces line breaks so nested markup picks up leading indentation.
        let out = process(HtmlFormatInput {
            code: "<div><section><p>Hello there</p></section></div>".to_string(),
            indent_size: 0,
            wrap_attributes: false,
            print_width: 20,
        });
        assert!(out.error.is_none(), "{:?}", out.error);
        assert!(out.formatted.contains('\t'), "expected tabs: {:?}", out.formatted);
    }

    #[test]
    fn four_space_indent() {
        let out = process(HtmlFormatInput {
            indent_size: 4,
            code: "<ul><li>One</li><li>Two</li></ul>".to_string(),
            wrap_attributes: false,
            print_width: 80,
        });
        assert!(out.error.is_none(), "{:?}", out.error);
        assert!(out.formatted.contains("    "));
    }

    #[test]
    fn invalid_html_handled_gracefully() {
        let out = process(input("<div><p>Unclosed"));
        let _ = out;
    }
}
