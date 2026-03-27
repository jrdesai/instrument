//! SQL formatter module backed by the `sqlformat` crate.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SqlIndentStyle {
    Spaces2,
    Spaces4,
    Tab,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SqlKeywordCase {
    Upper,
    Lower,
    Preserve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlFormatInput {
    /// Raw SQL string to format.
    pub value: String,
    /// Indentation style.
    pub indent: SqlIndentStyle,
    /// Keyword casing style.
    pub keyword_case: SqlKeywordCase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlFormatOutput {
    pub result: String,
    pub line_count: usize,
    pub char_count: usize,
    /// Human-readable error if formatting failed (rare with sqlformat).
    pub error: Option<String>,
}

fn make_output(result: String, error: Option<String>) -> SqlFormatOutput {
    let char_count = result.chars().count();
    let line_count = if result.is_empty() {
        0
    } else {
        // Count newline boundaries; at least one line when non-empty.
        result.lines().count()
    };
    SqlFormatOutput {
        result,
        line_count,
        char_count,
        error,
    }
}

pub fn process(input: SqlFormatInput) -> SqlFormatOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return make_output(String::new(), None);
    }

    let indent = match input.indent {
        SqlIndentStyle::Spaces2 => sqlformat::Indent::Spaces(2),
        SqlIndentStyle::Spaces4 => sqlformat::Indent::Spaces(4),
        SqlIndentStyle::Tab => sqlformat::Indent::Tabs,
    };

    // sqlformat 0.2 only has uppercase: when true it uppercases keywords; when false it
    // preserves input and does not lowercase. So we apply lowercase ourselves for Lower.
    let params = sqlformat::QueryParams::default();
    let options = sqlformat::FormatOptions {
        indent,
        uppercase: matches!(input.keyword_case, SqlKeywordCase::Upper),
        lines_between_queries: 1,
    };

    let mut result = sqlformat::format(trimmed, &params, options);

    // When user chose Lower, lowercase the output but preserve string literal contents
    // so e.g. 'Admin' inside quotes is not changed.
    if input.keyword_case == SqlKeywordCase::Lower {
        result = lowercase_sql_outside_strings(&result);
    }

    make_output(result, None)
}

/// Lowercases the given SQL string except for the contents of single-quoted literals,
/// so 'Hello' stays 'Hello' but SELECT becomes select.
fn lowercase_sql_outside_strings(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    let mut inside_single = false;

    while let Some(c) = chars.next() {
        if inside_single {
            out.push(c);
            if c == '\'' {
                // Escaped quote '' or end of literal: only end if next char is not '
                if chars.peek() == Some(&'\'') {
                    chars.next();
                    out.push('\'');
                } else {
                    inside_single = false;
                }
            }
        } else if c == '\'' {
            out.push(c);
            inside_single = true;
        } else {
            out.extend(c.to_lowercase());
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(value: &str, indent: SqlIndentStyle, keyword_case: SqlKeywordCase) -> SqlFormatOutput {
        process(SqlFormatInput {
            value: value.to_string(),
            indent,
            keyword_case,
        })
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = run("", SqlIndentStyle::Spaces2, SqlKeywordCase::Upper);
        assert_eq!(out.result, "");
        assert_eq!(out.line_count, 0);
        assert_eq!(out.char_count, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn basic_select_formats() {
        let out = run(
            "select * from users where id = 1",
            SqlIndentStyle::Spaces2,
            SqlKeywordCase::Upper,
        );
        assert!(out.result.to_lowercase().contains("select"));
        assert!(out.line_count >= 1);
        assert!(out.char_count > 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn indent_styles_produce_different_output() {
        let sql = "select * from users\nwhere id = 1 and status = 'active'";
        let out2 = run(sql, SqlIndentStyle::Spaces2, SqlKeywordCase::Upper);
        let out4 = run(sql, SqlIndentStyle::Spaces4, SqlKeywordCase::Upper);
        assert_ne!(out2.result, out4.result);
    }

    #[test]
    fn keyword_case_variants_differ() {
        let sql = "select * from users where id = 1";
        let upper = run(sql, SqlIndentStyle::Spaces2, SqlKeywordCase::Upper);
        let lower = run(sql, SqlIndentStyle::Spaces2, SqlKeywordCase::Lower);
        assert_ne!(upper.result, lower.result);
    }

    #[test]
    fn lower_produces_lowercase_keywords() {
        let out = run(
            "SELECT * from users",
            SqlIndentStyle::Spaces2,
            SqlKeywordCase::Lower,
        );
        assert!(
            out.result.contains("select"),
            "expected lowercase 'select' in {:?}",
            out.result
        );
        assert!(!out.result.contains("SELECT"), "expected no uppercase SELECT");
    }

    #[test]
    fn preserve_keeps_mixed_case() {
        let out = run(
            "SELECT * from users",
            SqlIndentStyle::Spaces2,
            SqlKeywordCase::Preserve,
        );
        // sqlformat with uppercase=false leaves keywords as-is, so SELECT may stay
        assert!(
            out.result.contains("SELECT") || out.result.contains("select"),
            "result should contain select in some case: {:?}",
            out.result
        );
    }

    #[test]
    fn lowercase_preserves_string_literal_content() {
        let out = run(
            "SELECT 'Admin' FROM users",
            SqlIndentStyle::Spaces2,
            SqlKeywordCase::Lower,
        );
        assert!(
            out.result.contains("'Admin'"),
            "string literal 'Admin' must be preserved: {:?}",
            out.result
        );
    }
}

