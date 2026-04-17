//! CSV previewer — parses CSV into structured headers + rows for table rendering.

use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the CSV Previewer.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CsvPreviewInput {
    pub text: String,
    pub has_headers: bool,
    pub delimiter: String,
    /// Maximum rows to return (default 1000).
    pub max_rows: Option<u32>,
}

/// Parsed CSV output ready for table rendering.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CsvPreviewOutput {
    /// Column headers (empty when `has_headers` is false).
    pub headers: Vec<String>,
    /// Data rows (up to `max_rows`).
    pub rows: Vec<Vec<String>>,
    /// Total rows in the file (may exceed `rows.len()` when truncated).
    pub total_rows: u32,
    pub truncated: bool,
    pub error: Option<String>,
}

pub fn process(input: CsvPreviewInput) -> CsvPreviewOutput {
    if input.text.trim().is_empty() {
        return empty();
    }

    let max_rows = input.max_rows.unwrap_or(1000) as usize;
    let delim = delimiter_byte(&input.delimiter);

    let mut rdr = ReaderBuilder::new()
        .has_headers(input.has_headers)
        .delimiter(delim)
        .flexible(true)
        .from_reader(input.text.as_bytes());

    let headers: Vec<String> = if input.has_headers {
        match rdr.headers() {
            Ok(h) => h.iter().map(|s| s.to_string()).collect(),
            Err(e) => return error_out(e.to_string()),
        }
    } else {
        vec![]
    };

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut total_rows: u32 = 0;

    for result in rdr.records() {
        match result {
            Ok(record) => {
                total_rows = total_rows.saturating_add(1);
                if rows.len() < max_rows {
                    rows.push(record.iter().map(|s| s.to_string()).collect());
                }
            }
            Err(e) => return error_out(e.to_string()),
        }
    }

    let truncated = (rows.len() as u32) < total_rows;

    CsvPreviewOutput {
        headers,
        rows,
        total_rows,
        truncated,
        error: None,
    }
}

fn delimiter_byte(s: &str) -> u8 {
    match s {
        "\t" | "tab" => b'\t',
        "|" | "pipe" => b'|',
        ";" | "semicolon" => b';',
        _ => b',',
    }
}

fn empty() -> CsvPreviewOutput {
    CsvPreviewOutput {
        headers: vec![],
        rows: vec![],
        total_rows: 0,
        truncated: false,
        error: None,
    }
}

fn error_out(msg: String) -> CsvPreviewOutput {
    CsvPreviewOutput {
        headers: vec![],
        rows: vec![],
        total_rows: 0,
        truncated: false,
        error: Some(msg),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(text: &str, has_headers: bool, delimiter: &str) -> CsvPreviewOutput {
        process(CsvPreviewInput {
            text: text.to_string(),
            has_headers,
            delimiter: delimiter.to_string(),
            max_rows: None,
        })
    }

    #[test]
    fn basic_with_headers() {
        let csv = "name,age\nAlice,30\nBob,25\n";
        let out = run(csv, true, ",");
        assert_eq!(out.headers, vec!["name", "age"]);
        assert_eq!(out.rows.len(), 2);
        assert_eq!(out.rows[0], vec!["Alice", "30"]);
        assert_eq!(out.total_rows, 2);
        assert!(!out.truncated);
        assert!(out.error.is_none());
    }

    #[test]
    fn no_headers() {
        let csv = "Alice,30\nBob,25\n";
        let out = run(csv, false, ",");
        assert!(out.headers.is_empty());
        assert_eq!(out.rows.len(), 2);
        assert_eq!(out.total_rows, 2);
    }

    #[test]
    fn tab_delimiter() {
        let csv = "name\tage\nAlice\t30\n";
        let out = run(csv, true, "\t");
        assert_eq!(out.headers, vec!["name", "age"]);
        assert_eq!(out.rows[0], vec!["Alice", "30"]);
    }

    #[test]
    fn truncation() {
        let rows: Vec<String> = (0..10).map(|i| format!("row{},val{}", i, i)).collect();
        let csv = format!("a,b\n{}", rows.join("\n"));
        let out = process(CsvPreviewInput {
            text: csv,
            has_headers: true,
            delimiter: ",".to_string(),
            max_rows: Some(5),
        });
        assert_eq!(out.rows.len(), 5);
        assert_eq!(out.total_rows, 10);
        assert!(out.truncated);
    }

    #[test]
    fn empty_input() {
        let out = run("", true, ",");
        assert!(out.headers.is_empty());
        assert!(out.rows.is_empty());
        assert!(out.error.is_none());
    }
}
