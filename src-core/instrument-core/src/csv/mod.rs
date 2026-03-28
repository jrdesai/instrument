//! CSV to JSON converter backed by the `csv` crate.
//!
//! Converts CSV text into either an array-of-objects (using headers as keys)
//! or an array-of-arrays, and returns pretty-printed JSON plus basic stats.

use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CsvToJsonInput {
    /// Raw CSV text.
    pub value: String,
    /// Treat first row as header names.
    pub has_headers: bool,
    /// Single-character delimiter: ",", "\t", "|", ";" etc.
    pub delimiter: String,
    /// Output layout.
    pub output_format: CsvOutputFormat,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum CsvOutputFormat {
    /// Array of objects: one object per row, using headers (or synthetic column names) as keys.
    ArrayOfObjects,
    /// Array of arrays: each row is a string array.
    ArrayOfArrays,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CsvToJsonOutput {
    /// Pretty-printed JSON string.
    pub result: String,
    /// Number of data rows (excluding header when has_headers == true).
    pub row_count: u32,
    /// Number of columns detected (max across rows / headers).
    pub column_count: u32,
    /// Error message if parsing failed.
    pub error: Option<String>,
}

fn empty_output() -> CsvToJsonOutput {
    CsvToJsonOutput {
        result: String::new(),
        row_count: 0,
        column_count: 0,
        error: None,
    }
}

/// Main CSV to JSON conversion entry point.
pub fn process(input: CsvToJsonInput) -> CsvToJsonOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return empty_output();
    }

    let delim_ch = input
        .delimiter
        .chars()
        .next()
        .unwrap_or(',');

    let mut rdr = ReaderBuilder::new()
        .has_headers(input.has_headers)
        .delimiter(delim_ch as u8)
        .from_reader(trimmed.as_bytes());

    match input.output_format {
        CsvOutputFormat::ArrayOfObjects => process_as_objects(&mut rdr, input.has_headers),
        CsvOutputFormat::ArrayOfArrays => process_as_arrays(&mut rdr),
    }
}

fn process_as_objects<R: std::io::Read>(
    rdr: &mut csv::Reader<R>,
    has_headers: bool,
) -> CsvToJsonOutput {
    let mut row_count = 0usize;

    // When we have headers, use them directly.
    // When we don't, synthesise headers from the first record.
    let headers: Vec<String>;
    let mut records = rdr.records();

    let mut column_count;

    if has_headers {
        let hdr = match rdr.headers() {
            Ok(h) => h.clone(),
            Err(e) => {
                return CsvToJsonOutput {
                    error: Some(e.to_string()),
                    ..empty_output()
                }
            }
        };
        column_count = hdr.len();
        headers = hdr.iter().map(|s| s.to_string()).collect();
    } else {
        // No headers: peek first record to derive column names.
        let first = match records.next() {
            Some(Ok(rec)) => rec,
            Some(Err(e)) => {
                return CsvToJsonOutput {
                    error: Some(e.to_string()),
                    ..empty_output()
                }
            }
            None => return empty_output(),
        };
        column_count = first.len();
        headers = (0..first.len())
            .map(|i| format!("col{}", i + 1))
            .collect();

        // We'll re-use this first record as the first data row below.
        let mut map = Map::new();
        for (i, field) in first.iter().enumerate() {
            let key = headers
                .get(i)
                .cloned()
                .unwrap_or_else(|| format!("col{}", i + 1));
            map.insert(key, Value::String(field.to_string()));
        }
        row_count += 1;

        let mut rows = vec![Value::Object(map)];
        // Process remaining records as data rows.
        for rec in records {
            match rec {
                Ok(record) => {
                    column_count = column_count.max(record.len());
                    let mut row_map = Map::new();
                    for (i, field) in record.iter().enumerate() {
                        let key = headers
                            .get(i)
                            .cloned()
                            .unwrap_or_else(|| format!("col{}", i + 1));
                        row_map.insert(key, Value::String(field.to_string()));
                    }
                    rows.push(Value::Object(row_map));
                    row_count += 1;
                }
                Err(e) => {
                    return CsvToJsonOutput {
                        error: Some(e.to_string()),
                        ..empty_output()
                    }
                }
            }
        }

        let result = match serde_json::to_string_pretty(&Value::Array(rows)) {
            Ok(s) => s,
            Err(e) => {
                return CsvToJsonOutput {
                    error: Some(e.to_string()),
                    ..empty_output()
                }
            }
        };

        return CsvToJsonOutput {
            result,
            row_count: u32::try_from(row_count).unwrap_or(u32::MAX),
            column_count: u32::try_from(column_count).unwrap_or(u32::MAX),
            error: None,
        };
    }

    // has_headers == true path: use headers from reader.
    let mut rows = Vec::new();
    for rec in rdr.records() {
        match rec {
            Ok(record) => {
                column_count = column_count.max(record.len());
                let mut map = Map::new();
                for (i, field) in record.iter().enumerate() {
                    let key = headers
                        .get(i)
                        .cloned()
                        .unwrap_or_else(|| format!("col{}", i + 1));
                    map.insert(key, Value::String(field.to_string()));
                }
                rows.push(Value::Object(map));
                row_count += 1;
            }
            Err(e) => {
                return CsvToJsonOutput {
                    error: Some(e.to_string()),
                    ..empty_output()
                }
            }
        }
    }

    let result = match serde_json::to_string_pretty(&Value::Array(rows)) {
        Ok(s) => s,
        Err(e) => {
            return CsvToJsonOutput {
                error: Some(e.to_string()),
                ..empty_output()
            }
        }
    };

    CsvToJsonOutput {
        result,
        row_count: u32::try_from(row_count).unwrap_or(u32::MAX),
        column_count: u32::try_from(column_count).unwrap_or(u32::MAX),
        error: None,
    }
}

fn process_as_arrays<R: std::io::Read>(rdr: &mut csv::Reader<R>) -> CsvToJsonOutput {
    let mut row_count = 0usize;
    let mut column_count = 0usize;
    let mut rows: Vec<Value> = Vec::new();

    for rec in rdr.records() {
        match rec {
            Ok(record) => {
                column_count = column_count.max(record.len());
                let row: Vec<Value> = record
                    .iter()
                    .map(|s| Value::String(s.to_string()))
                    .collect();
                rows.push(Value::Array(row));
                row_count += 1;
            }
            Err(e) => {
                return CsvToJsonOutput {
                    error: Some(e.to_string()),
                    ..empty_output()
                }
            }
        }
    }

    let result = match serde_json::to_string_pretty(&Value::Array(rows)) {
        Ok(s) => s,
        Err(e) => {
            return CsvToJsonOutput {
                error: Some(e.to_string()),
                ..empty_output()
            }
        }
    };

    CsvToJsonOutput {
        result,
        row_count: u32::try_from(row_count).unwrap_or(u32::MAX),
        column_count: u32::try_from(column_count).unwrap_or(u32::MAX),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn run(
        value: &str,
        has_headers: bool,
        delimiter: &str,
        output_format: CsvOutputFormat,
    ) -> CsvToJsonOutput {
        process(CsvToJsonInput {
            value: value.to_string(),
            has_headers,
            delimiter: delimiter.to_string(),
            output_format,
        })
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = run("", true, ",", CsvOutputFormat::ArrayOfObjects);
        assert_eq!(out.result, "");
        assert_eq!(out.row_count, 0);
        assert_eq!(out.column_count, 0);
        assert!(out.error.is_none());
    }

    #[test]
    fn basic_csv_with_headers_array_of_objects() {
        let csv = "name,email,age\nAlice,alice@example.com,30\nBob,bob@example.com,25\n";
        let out = run(csv, true, ",", CsvOutputFormat::ArrayOfObjects);
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert_eq!(out.row_count, 2);
        assert_eq!(out.column_count, 3);
        let v: Value = serde_json::from_str(&out.result).unwrap();
        assert!(v.is_array());
        assert_eq!(v.as_array().unwrap().len(), 2);
        assert_eq!(
            v[0],
            json!({"name": "Alice", "email": "alice@example.com", "age": "30"})
        );
    }

    #[test]
    fn tab_delimiter_with_headers() {
        let csv = "name\temail\nAlice\talice@example.com\n";
        let out = run(csv, true, "\t", CsvOutputFormat::ArrayOfObjects);
        assert!(out.error.is_none());
        assert_eq!(out.row_count, 1);
        assert_eq!(out.column_count, 2);
    }

    #[test]
    fn no_headers_synthesises_column_names() {
        let csv = "Alice,alice@example.com,30\nBob,bob@example.com,25\n";
        let out = run(csv, false, ",", CsvOutputFormat::ArrayOfObjects);
        assert!(out.error.is_none());
        assert_eq!(out.row_count, 2);
        assert_eq!(out.column_count, 3);
        let v: Value = serde_json::from_str(&out.result).unwrap();
        assert_eq!(
            v[0],
            json!({"col1": "Alice", "col2": "alice@example.com", "col3": "30"})
        );
    }

    #[test]
    fn array_of_arrays_mode() {
        let csv = "name,email\nAlice,alice@example.com\nBob,bob@example.com\n";
        let out = run(csv, true, ",", CsvOutputFormat::ArrayOfArrays);
        assert!(out.error.is_none(), "unexpected error: {:?}", out.error);
        assert_eq!(out.row_count, 2);
        let v: Value = serde_json::from_str(&out.result).unwrap();
        assert!(v.is_array());
        assert_eq!(v.as_array().unwrap().len(), 2);
        assert_eq!(
            v[0],
            json!(["Alice", "alice@example.com"])
        );
    }

    #[test]
    fn malformed_input_sets_error() {
        // Unbalanced quotes should produce a CSV parse error.
        let csv = "name,email\n\"Alice,alice@example.com\n";
        let out = run(csv, true, ",", CsvOutputFormat::ArrayOfObjects);
        assert!(out.error.is_some());
        assert_eq!(out.result, "");
        assert_eq!(out.row_count, 0);
    }
}

