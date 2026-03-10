use serde_json::Value;

/// Convert JSON to XML string with a given root element name.
pub fn convert(value: &Value, root_element: &str) -> Result<String, String> {
    let root_tag = sanitize_tag(root_element);
    let mut out = String::new();
    out.push_str(r#"<?xml version="1.0" encoding="UTF-8"?>"#);
    out.push('\n');
    value_to_xml(value, &root_tag, 0, &mut out);
    Ok(out)
}

fn sanitize_tag(name: &str) -> String {
    let mut result = String::new();
    let mut chars = name.chars().peekable();

    if let Some(first) = chars.peek().cloned() {
        if first.is_ascii_alphabetic() || first == '_' {
            result.push(first);
            chars.next();
        } else {
            result.push('_');
        }
    } else {
        return "_".to_string();
    }

    for ch in chars {
        if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' || ch == '.' {
            result.push(ch);
        } else {
            result.push('_');
        }
    }

    result
}

fn escape_text(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '&' => "&amp;".to_string(),
            '<' => "&lt;".to_string(),
            '>' => "&gt;".to_string(),
            '"' => "&quot;".to_string(),
            '\'' => "&apos;".to_string(),
            _ => c.to_string(),
        })
        .collect::<String>()
}

fn indent(n: usize) -> String {
    "  ".repeat(n)
}

fn value_to_xml(value: &Value, tag: &str, indent_level: usize, out: &mut String) {
    match value {
        Value::Null => {
            out.push_str(&format!("{}<{} />\n", indent(indent_level), tag));
        }
        Value::Bool(b) => {
            out.push_str(&format!(
                "{}<{}>{}</{}>\n",
                indent(indent_level),
                tag,
                if *b { "true" } else { "false" },
                tag
            ));
        }
        Value::Number(n) => {
            out.push_str(&format!(
                "{}<{}>{}</{}>\n",
                indent(indent_level),
                tag,
                n,
                tag
            ));
        }
        Value::String(s) => {
            out.push_str(&format!(
                "{}<{}>{}</{}>\n",
                indent(indent_level),
                tag,
                escape_text(s),
                tag
            ));
        }
        Value::Array(arr) => {
            out.push_str(&format!("{}<{}>\n", indent(indent_level), tag));
            for elem in arr {
                value_to_xml(elem, tag, indent_level + 1, out);
            }
            out.push_str(&format!("{}</{}>\n", indent(indent_level), tag));
        }
        Value::Object(map) => {
            out.push_str(&format!("{}<{}>\n", indent(indent_level), tag));
            for (key, v) in map {
                let child_tag = sanitize_tag(key);
                value_to_xml(v, &child_tag, indent_level + 1, out);
            }
            out.push_str(&format!("{}</{}>\n", indent(indent_level), tag));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn simple_object() {
        let v = json!({"name": "John", "age": 30});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("<root>"));
        assert!(xml.contains("<name>John</name>"));
        assert!(xml.contains("<age>30</age>"));
        assert!(xml.contains("</root>"));
    }

    #[test]
    fn nested_object() {
        let v = json!({"user": {"name": "John"}});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("<user>"));
        assert!(xml.contains("<name>John</name>"));
    }

    #[test]
    fn array_elements() {
        let v = json!({"items": [1, 2]});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("<items>"));
        // repeated child tags
        assert!(xml.contains("<items>1</items>"));
        assert!(xml.contains("<items>2</items>"));
    }

    #[test]
    fn null_value() {
        let v = json!({"value": null});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("<value />"));
    }

    #[test]
    fn special_chars_escaped() {
        let v = json!({"text": "&<>\"'"});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("&amp;"));
        assert!(xml.contains("&lt;"));
        assert!(xml.contains("&gt;"));
        assert!(xml.contains("&quot;"));
        assert!(xml.contains("&apos;"));
    }

    #[test]
    fn invalid_key_sanitised() {
        let v = json!({"123key": "value"});
        let xml = convert(&v, "root").expect("xml ok");
        assert!(xml.contains("<_123key>value</_123key>"));
    }

    #[test]
    fn custom_root() {
        let v = json!({"a": 1});
        let xml = convert(&v, "data").expect("xml ok");
        assert!(xml.contains("<data>"));
        assert!(xml.contains("</data>"));
    }
}

