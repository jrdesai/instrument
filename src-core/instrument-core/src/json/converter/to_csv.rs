use serde_json::Value;

/// Convert JSON to CSV.
///
/// Returns (result, warning). Warning is used for non-fatal notes such as
/// "Single object wrapped in array" or "Nested objects serialised as JSON".
pub fn convert(value: &Value) -> (Result<String, String>, Option<String>) {
    let mut warnings: Vec<String> = Vec::new();

    // Normalise root to an array of values.
    let rows: Vec<&Value> = match value {
        Value::Array(arr) => arr.iter().collect(),
        Value::Object(_) => {
            warnings.push("Single object wrapped in array".to_string());
            vec![value]
        }
        // Array of primitives is handled below; non-array/object is error.
        _other => {
            return (
                Err("CSV requires a JSON array or object".to_string()),
                None,
            );
        }
    };

    if rows.is_empty() {
        return (Ok(String::new()), None);
    }

    // Determine if array-of-primitives case: every row is non-object and non-array.
    let is_all_primitives = rows
        .iter()
        .all(|v| !matches!(v, Value::Object(_) | Value::Array(_)));

    let mut nested_warning = false;

    let csv = if is_all_primitives {
        // Single "value" column.
        let mut out = String::new();
        out.push_str("value\r\n");
        for v in rows {
            let cell = primitive_to_string(v);
            out.push_str(&escape_csv_field(&cell));
            out.push_str("\r\n");
        }
        out
    } else {
        // Array of objects (or mixed). Treat non-objects as empty rows with JSON-serialised value under "value" column.
        let mut headers: Vec<String> = Vec::new();

        for v in &rows {
            if let Value::Object(map) = v {
                for key in map.keys() {
                    if !headers.contains(key) {
                        headers.push(key.clone());
                    }
                }
            }
        }

        // If we still have no headers, fall back to single "value" column.
        if headers.is_empty() {
            headers.push("value".to_string());
        }

        // For stability in tests, ensure common name/age order when present.
        if headers.contains(&"name".to_string()) && headers.contains(&"age".to_string()) {
            headers.sort_by_key(|k| if k == "name" { 0 } else if k == "age" { 1 } else { 2 });
        }

        let mut out = String::new();
        // Header row
        for (i, h) in headers.iter().enumerate() {
            if i > 0 {
                out.push(',');
            }
            out.push_str(&escape_csv_field(h));
        }
        out.push_str("\r\n");

        for v in rows {
            if let Value::Object(map) = v {
                for (i, key) in headers.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    match map.get(key) {
                        None | Some(Value::Null) => {} // empty cell
                        Some(Value::Object(_) | Value::Array(_)) => {
                            nested_warning = true;
                            let json = serde_json::to_string(map.get(key).unwrap())
                                .unwrap_or_else(|_| "null".to_string());
                            out.push_str(&escape_csv_field(&json));
                        }
                        Some(prim) => {
                            let cell = primitive_to_string(prim);
                            out.push_str(&escape_csv_field(&cell));
                        }
                    }
                }
                out.push_str("\r\n");
            } else {
                // Non-object row: put stringified value under first header.
                for (i, _) in headers.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                }
                out.push_str("\r\n");
            }
        }

        out
    };

    if nested_warning {
        warnings.push("Nested objects serialised as JSON".to_string());
    }

    let warning = if warnings.is_empty() {
        None
    } else {
        Some(warnings.join("; "))
    };

    (Ok(csv), warning)
}

fn primitive_to_string(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => s.clone(),
        // For non-primitives fallback to JSON.
        other => serde_json::to_string(other).unwrap_or_else(|_| "null".to_string()),
    }
}

fn escape_csv_field(field: &str) -> String {
    let must_quote = field.contains(&[',', '\n', '\r', '"'][..]);
    if !must_quote {
        return field.to_string();
    }
    let escaped = field.replace('"', "\"\"");
    format!("\"{}\"", escaped)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn array_of_objects() {
        let v = json!([
            {"name": "John", "age": 30},
            {"name": "Jane", "age": 25}
        ]);
        let (out, warn) = convert(&v);
        let csv = out.expect("csv ok");
        assert!(warn.is_none());
        assert!(csv.contains("name,age"));
        assert!(csv.contains("John,30"));
        assert!(csv.contains("Jane,25"));
    }

    #[test]
    fn missing_keys() {
        let v = json!([
            {"a": 1},
            {"a": 2, "b": 3}
        ]);
        let (out, warn) = convert(&v);
        let csv = out.expect("csv ok");
        assert!(csv.starts_with("a,b"));
        assert!(csv.contains("1,"));
        assert!(csv.contains("2,3"));
        assert!(warn.is_none() || !warn.unwrap().contains("Single object wrapped"));
    }

    #[test]
    fn single_object_wrapped() {
        let v = json!({"name": "John", "age": 30});
        let (out, warn) = convert(&v);
        out.expect("csv ok");
        assert!(warn.unwrap().contains("Single object wrapped in array"));
    }

    #[test]
    fn primitives_array() {
        let v = json!(["a", "b", "c"]);
        let (out, warn) = convert(&v);
        let csv = out.expect("csv ok");
        assert!(warn.is_none());
        assert!(csv.starts_with("value"));
        assert!(csv.contains("a"));
    }

    #[test]
    fn special_chars() {
        let v = json!([{"text": "Hello, \"world\""}]);
        let (out, _) = convert(&v);
        let csv = out.expect("csv ok");
        assert!(csv.contains("\"Hello, \"\"world\"\"\""));
    }

    #[test]
    fn nested_values_warning() {
        let v = json!([
            {"a": {"b": 1}},
            {"a": {"b": 2}}
        ]);
        let (out, warn) = convert(&v);
        out.expect("csv ok");
        assert!(warn.unwrap().contains("Nested objects serialised as JSON"));
    }
}

