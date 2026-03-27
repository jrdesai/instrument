//! String escaper: escape/unescape for JSON, Regex, HTML, SQL, Shell, and CSV.
//!
//! No external crates; pure string manipulation. Empty input returns empty result,
//! changes 0, no error.

use serde::{Deserialize, Serialize};

/// Input for the String Escaper tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StringEscaperInput {
    pub text: String,
    pub mode: EscapeMode,
    pub target: EscapeTarget,
}

/// Escape or unescape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EscapeMode {
    Escape,
    Unescape,
}

/// Target format: JSON, Regex, HTML, SQL, Shell, CSV.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EscapeTarget {
    Json,
    Regex,
    Html,
    Sql,
    Shell,
    Csv,
}

/// Output: result string, number of replacements, optional error.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StringEscaperOutput {
    pub result: String,
    pub changes: usize,
    pub error: Option<String>,
}

/// Process escape or unescape for the given target.
///
/// # Example
///
/// ```
/// use instrument_core::text::string_escaper::{
///     process, StringEscaperInput, EscapeMode, EscapeTarget,
/// };
///
/// let out = process(StringEscaperInput {
///     text: r#"hello "world""#.to_string(),
///     mode: EscapeMode::Escape,
///     target: EscapeTarget::Json,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.result, r#"hello \"world\""#);
/// assert_eq!(out.changes, 2);
/// ```
pub fn process(input: StringEscaperInput) -> StringEscaperOutput {
    if input.text.is_empty() {
        return StringEscaperOutput {
            result: String::new(),
            changes: 0,
            error: None,
        };
    }
    match input.mode {
        EscapeMode::Escape => do_escape(&input),
        EscapeMode::Unescape => do_unescape(&input),
    }
}

fn do_escape(input: &StringEscaperInput) -> StringEscaperOutput {
    match input.target {
        EscapeTarget::Json => json_escape(&input.text),
        EscapeTarget::Regex => regex_escape(&input.text),
        EscapeTarget::Html => html_escape(&input.text),
        EscapeTarget::Sql => sql_escape(&input.text),
        EscapeTarget::Shell => shell_escape(&input.text),
        EscapeTarget::Csv => csv_escape(&input.text),
    }
}

fn do_unescape(input: &StringEscaperInput) -> StringEscaperOutput {
    match input.target {
        EscapeTarget::Json => json_unescape(&input.text),
        EscapeTarget::Regex => regex_unescape(&input.text),
        EscapeTarget::Html => html_unescape(&input.text),
        EscapeTarget::Sql => sql_unescape(&input.text),
        EscapeTarget::Shell => shell_unescape(&input.text),
        EscapeTarget::Csv => csv_unescape(&input.text),
    }
}

// --- JSON ---
fn json_escape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len() * 2);
    let mut changes = 0usize;
    for c in s.chars() {
        match c {
            '"' => {
                out.push_str("\\\"");
                changes += 1;
            }
            '\\' => {
                out.push_str("\\\\");
                changes += 1;
            }
            '\n' => {
                out.push_str("\\n");
                changes += 1;
            }
            '\r' => {
                out.push_str("\\r");
                changes += 1;
            }
            '\t' => {
                out.push_str("\\t");
                changes += 1;
            }
            '\u{0008}' => {
                out.push_str("\\b");
                changes += 1;
            }
            '\u{000c}' => {
                out.push_str("\\f");
                changes += 1;
            }
            other if other.is_control() && other != '\n' && other != '\r' && other != '\t' => {
                out.push_str(&format!("\\u{:04x}", other as u32));
                changes += 1;
            }
            _ => out.push(c),
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

fn json_unescape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len());
    let mut changes = 0usize;
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '\\' {
            out.push(c);
            continue;
        }
        let next = chars.next();
        match next {
            Some('"') => {
                out.push('"');
                changes += 1;
            }
            Some('\\') => {
                out.push('\\');
                changes += 1;
            }
            Some('n') => {
                out.push('\n');
                changes += 1;
            }
            Some('r') => {
                out.push('\r');
                changes += 1;
            }
            Some('t') => {
                out.push('\t');
                changes += 1;
            }
            Some('b') => {
                out.push('\u{0008}');
                changes += 1;
            }
            Some('f') => {
                out.push('\u{000c}');
                changes += 1;
            }
            Some('u') => {
                let hex: String = chars.by_ref().take(4).collect();
                if hex.len() != 4 || !hex.chars().all(|c| c.is_ascii_hexdigit()) {
                    return StringEscaperOutput {
                        result: out,
                        changes,
                        error: Some(format!("Invalid \\u escape sequence: \\u{}", hex)),
                    };
                }
                if let Some(code) = u32::from_str_radix(&hex, 16).ok()
                    .and_then(char::from_u32)
                {
                    out.push(code);
                    changes += 1;
                } else {
                    return StringEscaperOutput {
                        result: out,
                        changes,
                        error: Some(format!("Invalid \\u{} code point", hex)),
                    };
                }
            }
            Some(other) => {
                return StringEscaperOutput {
                    result: out,
                    changes,
                    error: Some(format!("Invalid escape sequence: \\{}", other)),
                };
            }
            None => {
                return StringEscaperOutput {
                    result: out,
                    changes,
                    error: Some("Backslash at end of string".to_string()),
                };
            }
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

// --- Regex ---
const REGEX_SPECIAL: &[char] = &['.', '*', '+', '?', '^', '$', '{', '}', '[', ']', '|', '(', ')', '\\', '/', '='];

fn regex_escape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len() * 2);
    let mut changes = 0usize;
    for c in s.chars() {
        if REGEX_SPECIAL.contains(&c) {
            out.push('\\');
            out.push(c);
            changes += 1;
        } else {
            out.push(c);
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

fn regex_unescape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len());
    let mut changes = 0usize;
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\\' {
            if let Some(n) = chars.next() {
                if REGEX_SPECIAL.contains(&n) {
                    out.push(n);
                    changes += 1;
                } else {
                    out.push('\\');
                    out.push(n);
                }
            } else {
                out.push('\\');
            }
        } else {
            out.push(c);
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

// --- HTML (Named: &amp; &lt; &gt; &quot; &#39;) ---
fn html_escape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len() * 2);
    let mut changes = 0usize;
    for c in s.chars() {
        match c {
            '&' => {
                out.push_str("&amp;");
                changes += 1;
            }
            '<' => {
                out.push_str("&lt;");
                changes += 1;
            }
            '>' => {
                out.push_str("&gt;");
                changes += 1;
            }
            '"' => {
                out.push_str("&quot;");
                changes += 1;
            }
            '\'' => {
                out.push_str("&#39;");
                changes += 1;
            }
            _ => out.push(c),
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

fn html_unescape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len());
    let mut changes = 0usize;
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] != b'&' {
            let start = i;
            i += 1;
            while i < bytes.len() && (bytes[i] & 0xC0) == 0x80 {
                i += 1;
            }
            out.push_str(&s[start..i]);
            continue;
        }
        let amp_pos = i;
        i += 1;
        if i >= bytes.len() {
            out.push('&');
            continue;
        }
        let semicolon = s[i..].find(';');
        let Some(semi_off) = semicolon else {
            out.push('&');
            continue;
        };
        let semi_pos = i + semi_off;
        let between = &s[i..semi_pos];
        i = semi_pos + 1;

        if between.is_empty() {
            out.push('&');
            continue;
        }
        if between == "#" {
            out.push_str(&s[amp_pos..i]);
            continue;
        }
        if let Some(num) = between.strip_prefix('#') {
            let code = if num.starts_with('x') || num.starts_with('X') {
                num[1..].chars().filter_map(|c| c.to_digit(16)).fold(0u32, |a, d| a * 16 + d)
            } else {
                num.chars().filter_map(|c| c.to_digit(10)).fold(0u32, |a, d| a * 10 + d)
            };
            if let Some(ch) = char::from_u32(code) {
                out.push(ch);
                changes += 1;
            } else {
                out.push_str(&s[amp_pos..i]);
            }
            continue;
        }
        if between.chars().all(|c| c.is_ascii_alphanumeric()) {
            let mut found = false;
            for (name, ch) in &[("amp", '&'), ("lt", '<'), ("gt", '>'), ("quot", '"'), ("apos", '\'')] {
                if between == *name {
                    out.push(*ch);
                    changes += 1;
                    found = true;
                    break;
                }
            }
            if !found {
                out.push_str(&s[amp_pos..i]);
            }
        } else {
            out.push_str(&s[amp_pos..i]);
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

// --- SQL ---
fn sql_escape(s: &str) -> StringEscaperOutput {
    let changes = s.matches('\'').count();
    let result = s.replace('\'', "''");
    StringEscaperOutput {
        result,
        changes,
        error: None,
    }
}

fn sql_unescape(s: &str) -> StringEscaperOutput {
    let mut changes = 0usize;
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\'' {
            if chars.peek() == Some(&'\'') {
                chars.next();
                out.push('\'');
                changes += 1;
            } else {
                out.push(c);
            }
        } else {
            out.push(c);
        }
    }
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

// --- Shell ---
fn shell_escape(s: &str) -> StringEscaperOutput {
    let mut out = String::with_capacity(s.len() + 4);
    out.push('\'');
    let mut changes = 1usize; // one "wrap" counts as a change, or we count internal quotes
    for c in s.chars() {
        if c == '\'' {
            out.push_str("'\\''");
            changes += 1;
        } else {
            out.push(c);
        }
    }
    out.push('\'');
    StringEscaperOutput {
        result: out,
        changes,
        error: None,
    }
}

fn shell_unescape(s: &str) -> StringEscaperOutput {
    let t = s.trim();
    let mut changes = 0usize;
    if t.len() >= 2 && t.starts_with('\'') && t.ends_with('\'') {
        let inner = &t[1..t.len() - 1];
        let mut out = String::with_capacity(inner.len());
        let mut chars = inner.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\'' && chars.peek() == Some(&'\\') {
                chars.next();
                if chars.next() == Some('\'') {
                    out.push('\'');
                    changes += 1;
                } else {
                    out.push_str("'\\");
                }
            } else {
                out.push(c);
            }
        }
        return StringEscaperOutput {
            result: out,
            changes,
            error: None,
        };
    }
    StringEscaperOutput {
        result: s.to_string(),
        changes: 0,
        error: None,
    }
}

// --- CSV ---
fn csv_escape(s: &str) -> StringEscaperOutput {
    let needs_wrap = s.contains(',') || s.contains('\n') || s.contains('"');
    if !needs_wrap {
        return StringEscaperOutput {
            result: s.to_string(),
            changes: 0,
            error: None,
        };
    }
    let mut changes = 1usize; // wrap
    let escaped = s.replace('"', "\"\"");
    changes += s.matches('"').count();
    let result = format!("\"{}\"", escaped);
    StringEscaperOutput {
        result,
        changes,
        error: None,
    }
}

fn csv_unescape(s: &str) -> StringEscaperOutput {
    let t = s.trim();
    if t.len() >= 2 && t.starts_with('"') && t.ends_with('"') {
        let inner = &t[1..t.len() - 1];
        let result = inner.replace("\"\"", "\"");
        let changes = inner.matches("\"\"").count();
        return StringEscaperOutput {
            result,
            changes,
            error: None,
        };
    }
    StringEscaperOutput {
        result: s.to_string(),
        changes: 0,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_escape_basic() {
        let out = process(StringEscaperInput {
            text: r#"hello "world""#.to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Json,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, r#"hello \"world\""#);
        assert_eq!(out.changes, 2);
    }

    #[test]
    fn json_escape_newline() {
        let out = process(StringEscaperInput {
            text: "line1\nline2".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Json,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "line1\\nline2");
        assert_eq!(out.changes, 1);
    }

    #[test]
    fn json_unescape() {
        let out = process(StringEscaperInput {
            text: r#"hello \"world\""#.to_string(),
            mode: EscapeMode::Unescape,
            target: EscapeTarget::Json,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, r#"hello "world""#);
        assert_eq!(out.changes, 2);
    }

    #[test]
    fn regex_escape() {
        let out = process(StringEscaperInput {
            text: "1+1=2".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Regex,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, r"1\+1\=2");
        assert_eq!(out.changes, 2);
    }

    #[test]
    fn html_escape() {
        let out = process(StringEscaperInput {
            text: "<script>".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Html,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "&lt;script&gt;");
        assert_eq!(out.changes, 2);
    }

    #[test]
    fn sql_escape() {
        let out = process(StringEscaperInput {
            text: "it's".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Sql,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "it''s");
        assert_eq!(out.changes, 1);
    }

    #[test]
    fn shell_escape() {
        let out = process(StringEscaperInput {
            text: "hello world".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Shell,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "'hello world'");
        assert!(out.changes >= 1);
    }

    #[test]
    fn csv_escape() {
        let out = process(StringEscaperInput {
            text: "hello, world".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Csv,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, r#""hello, world""#);
        assert!(out.changes >= 1);
    }

    #[test]
    fn empty_input() {
        let out = process(StringEscaperInput {
            text: String::new(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Json,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "");
        assert_eq!(out.changes, 0);
    }

    #[test]
    fn no_changes_needed() {
        let out = process(StringEscaperInput {
            text: "hello".to_string(),
            mode: EscapeMode::Escape,
            target: EscapeTarget::Json,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "hello");
        assert_eq!(out.changes, 0);
    }
}
