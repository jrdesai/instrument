//! XML formatter — pretty-prints XML with configurable indentation.

use quick_xml::{events::Event, Reader, Writer};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::io::Cursor;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct XmlFormatInput {
    /// Raw XML text to format.
    pub value: String,
    /// Indentation size in spaces (2 or 4). Defaults to 2.
    pub indent_size: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct XmlFormatOutput {
    /// Formatted XML string.
    pub result: String,
    /// Number of lines in formatted output.
    pub line_count: u32,
    /// Character count of formatted output.
    pub char_count: u32,
    /// Error message if parsing/formatting failed.
    pub error: Option<String>,
}

/// Format (pretty-print) XML with the given indentation.
pub fn process(input: XmlFormatInput) -> XmlFormatOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return XmlFormatOutput {
            result: String::new(),
            line_count: 0,
            char_count: 0,
            error: None,
        };
    }

    let indent = input.indent_size.clamp(1, 8);

    let mut reader = Reader::from_str(trimmed);
    reader.config_mut().trim_text(true);

    let mut writer = Writer::new_with_indent(Cursor::new(Vec::new()), b' ', indent as usize);

    loop {
        match reader.read_event() {
            Ok(Event::Eof) => break,
            Ok(event) => {
                if let Err(e) = writer.write_event(event) {
                    return XmlFormatOutput {
                        result: String::new(),
                        line_count: 0,
                        char_count: 0,
                        error: Some(e.to_string()),
                    };
                }
            }
            Err(e) => {
                return XmlFormatOutput {
                    result: String::new(),
                    line_count: 0,
                    char_count: 0,
                    error: Some(format!(
                        "XML parse error at position {}: {}",
                        reader.error_position(),
                        e
                    )),
                };
            }
        }
    }

    let result_bytes = writer.into_inner().into_inner();
    match String::from_utf8(result_bytes) {
        Ok(result) => {
            let line_count = u32::try_from(result.lines().count()).unwrap_or(u32::MAX);
            let char_count = u32::try_from(result.chars().count()).unwrap_or(u32::MAX);
            XmlFormatOutput {
                result,
                line_count,
                char_count,
                error: None,
            }
        }
        Err(e) => XmlFormatOutput {
            result: String::new(),
            line_count: 0,
            char_count: 0,
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input() {
        let out = process(XmlFormatInput {
            value: String::new(),
            indent_size: 2,
        });
        assert_eq!(out.result, "");
        assert!(out.error.is_none());
    }

    #[test]
    fn formats_simple_xml() {
        let xml = r#"<root><child>text</child></root>"#;
        let out = process(XmlFormatInput {
            value: xml.to_string(),
            indent_size: 2,
        });
        assert!(out.error.is_none(), "error: {:?}", out.error);
        assert!(out.result.contains('\n'));
    }

    #[test]
    fn invalid_xml_returns_error() {
        let xml = "<root><node></root>";
        let out = process(XmlFormatInput {
            value: xml.to_string(),
            indent_size: 2,
        });
        assert!(out.error.is_some());
        assert_eq!(out.result, "");
    }
}
