use serde_json::Value;

/// Convert JSON to YAML using serde_yaml.
pub fn convert(value: &Value) -> Result<String, String> {
    serde_yaml::to_string(value).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn simple_yaml() {
        let v = json!({"name": "John", "age": 30, "active": true});
        let out = convert(&v).expect("yaml conversion should succeed");
        assert!(out.contains("name: John"));
        assert!(out.contains("age: 30"));
        assert!(out.contains("active: true"));
    }
}

