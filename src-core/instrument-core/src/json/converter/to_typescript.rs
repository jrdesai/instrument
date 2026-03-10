use serde_json::Value;

#[derive(Clone, Debug, PartialEq, Eq)]
struct InterfaceField {
    name: String,
    type_str: String,
    optional: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct InterfaceDef {
    name: String,
    fields: Vec<InterfaceField>,
}

/// Convert JSON to TypeScript type declarations.
pub fn convert(
    value: &Value,
    root_name: &str,
    export: bool,
    optional: bool,
) -> Result<String, String> {
    let mut interfaces: Vec<InterfaceDef> = Vec::new();
    let root_type = match value {
        Value::Array(_) => infer_type(value, "Item", &mut interfaces, optional),
        _ => infer_type(value, root_name, &mut interfaces, optional),
    };

    let mut out = String::new();

    // Emit interfaces in insertion order (nested first, root last).
    for (idx, iface) in interfaces.iter().enumerate() {
        if idx > 0 {
            out.push_str("\n");
        }
        if export {
            out.push_str("export ");
        }
        out.push_str("interface ");
        out.push_str(&iface.name);
        out.push_str(" {\n");
        for field in &iface.fields {
            out.push_str("  ");
            out.push_str(&field.name);
            if field.optional {
                out.push('?');
            }
            out.push_str(": ");
            out.push_str(&field.type_str);
            out.push_str(";\n");
        }
        out.push_str("}\n");
    }

    // Root alias when root is not exactly an interface of the same name,
    // e.g. when root is an array or primitive.
    if !root_type.is_empty() {
        if !out.is_empty() {
            out.push('\n');
        }
        if export {
            out.push_str("export ");
        }
        out.push_str("type ");
        out.push_str(root_name);
        out.push_str(" = ");
        out.push_str(&root_type);
        out.push_str(";\n");
    }

    Ok(out)
}

fn infer_type(
    value: &Value,
    name_hint: &str,
    interfaces: &mut Vec<InterfaceDef>,
    optional: bool,
) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(_) => "boolean".to_string(),
        Value::Number(_) => "number".to_string(),
        Value::String(_) => "string".to_string(),
        Value::Array(arr) => infer_array_type(arr, name_hint, interfaces, optional),
        Value::Object(map) => {
            let iface_name = pascal_case(if name_hint.is_empty() {
                "Root"
            } else {
                name_hint
            });
            let mut fields: Vec<InterfaceField> = Vec::new();
            for (k, v) in map {
                let field_type = infer_type(v, k, interfaces, optional);
                fields.push(InterfaceField {
                    name: k.clone(),
                    type_str: field_type,
                    optional,
                });
            }
            add_or_merge_interface(interfaces, InterfaceDef { name: iface_name.clone(), fields });
            iface_name
        }
    }
}

fn infer_array_type(
    arr: &[Value],
    name_hint: &str,
    interfaces: &mut Vec<InterfaceDef>,
    optional: bool,
) -> String {
    if arr.is_empty() {
        return "unknown[]".to_string();
    }

    // If any element is object or array, treat as array-of-complex.
    if arr.iter().any(|v| matches!(v, Value::Object(_) | Value::Array(_))) {
        // Use singularised name for element interface.
        let elem_name = singularize(&pascal_case(if name_hint.is_empty() {
            "Item"
        } else {
            name_hint
        }));
        let elem_type = infer_type(&arr[0], &elem_name, interfaces, optional);
        return format!("{}[]", elem_type);
    }

    // Otherwise, primitives/mixed primitives.
    let mut types: Vec<String> = Vec::new();
    for v in arr {
        let t = match v {
            Value::Null => "null".to_string(),
            Value::Bool(_) => "boolean".to_string(),
            Value::Number(_) => "number".to_string(),
            Value::String(_) => "string".to_string(),
            _ => "unknown".to_string(),
        };
        if !types.contains(&t) {
            types.push(t);
        }
    }

    if types.len() == 1 {
        format!("{}[]", types[0])
    } else {
        format!("({})[]", types.join(" | "))
    }
}

fn add_or_merge_interface(interfaces: &mut Vec<InterfaceDef>, iface: InterfaceDef) {
    if let Some(existing) = interfaces.iter().find(|i| i.name == iface.name) {
        if *existing == iface {
            return;
        }
        // Different shape: generate a suffixed name and insert.
        let mut idx = 2;
        let base = iface.name.clone();
        let new_name = loop {
            let candidate = format!("{}{}", base, idx);
            if !interfaces.iter().any(|i| i.name == candidate) {
                break candidate;
            }
            idx += 1;
        };
        let mut renamed = iface;
        renamed.name = new_name;
        interfaces.push(renamed);
    } else {
        interfaces.push(iface);
    }
}

fn pascal_case(s: &str) -> String {
    let mut out = String::new();
    let mut capitalize_next = true;
    for ch in s.chars() {
        if ch.is_alphanumeric() {
            if capitalize_next {
                out.extend(ch.to_uppercase());
                capitalize_next = false;
            } else {
                out.push(ch);
            }
        } else {
            capitalize_next = true;
        }
    }
    if out.is_empty() {
        "Root".to_string()
    } else {
        out
    }
}

fn singularize(name: &str) -> String {
    if name.ends_with("ies") && name.len() > 3 {
        format!("{}y", &name[..name.len() - 3])
    } else if name.ends_with('s') && name.len() > 1 {
        name[..name.len() - 1].to_string()
    } else {
        name.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn simple_object() {
        let v = json!({"id": 1, "name": "John"});
        let ts = convert(&v, "Root", true, false).unwrap();
        assert!(ts.contains("export interface Root"));
        assert!(ts.contains("id: number;"));
        assert!(ts.contains("name: string;"));
    }

    #[test]
    fn nested_object() {
        let v = json!({"user": {"name": "John"}});
        let ts = convert(&v, "Root", true, false).unwrap();
        assert!(ts.contains("export interface User"));
        assert!(ts.contains("name: string;"));
        assert!(ts.contains("export interface Root"));
        assert!(ts.contains("user: User;"));
    }

    #[test]
    fn array_of_objects() {
        let v = json!({"users": [{"name": "A"}, {"name": "B"}]});
        let ts = convert(&v, "Root", true, false).unwrap();
        assert!(ts.contains("export interface User"));
        assert!(ts.contains("name: string;"));
        assert!(ts.contains("users: User[];"));
    }

    #[test]
    fn primitives() {
        let v = json!({"a": 1, "b": true, "c": "x", "d": null});
        let ts = convert(&v, "Root", false, false).unwrap();
        assert!(ts.contains("a: number;"));
        assert!(ts.contains("b: boolean;"));
        assert!(ts.contains("c: string;"));
        assert!(ts.contains("d: null;"));
    }

    #[test]
    fn optional_fields() {
        let v = json!({"a": 1, "b": 2});
        let ts = convert(&v, "Root", false, true).unwrap();
        assert!(ts.contains("a?: number;"));
        assert!(ts.contains("b?: number;"));
    }

    #[test]
    fn root_array() {
        let v = json!([{"id": 1}, {"id": 2}]);
        let ts = convert(&v, "Root", false, false).unwrap();
        assert!(ts.contains("interface Item"));
        assert!(ts.contains("id: number;"));
        assert!(ts.contains("type Root = Item[];"));
    }

    #[test]
    fn empty_array_unknown() {
        let v = json!([]);
        let ts = convert(&v, "Root", false, false).unwrap();
        assert!(ts.contains("type Root = unknown[];"));
    }

    #[test]
    fn mixed_array_union() {
        let v = json!({"values": [1, "a", true, null]});
        let ts = convert(&v, "Root", false, false).unwrap();
        assert!(ts.contains("(number | string | boolean | null)[]"));
    }

    #[test]
    fn custom_root_name() {
        let v = json!({"x": 1});
        let ts = convert(&v, "MyRoot", true, false).unwrap();
        assert!(ts.contains("export interface MyRoot"));
        assert!(ts.contains("type MyRoot = MyRoot;"));
    }
}

