//! JSON diff: compare two JSON values and report added, removed, and changed paths.
//!
//! # Example
//!
//! ```
//! use instrument_core::json::diff::{process, JsonDiffInput};
//!
//! let out = process(JsonDiffInput {
//!     left: r#"{"a":1}"#.to_string(),
//!     right: r#"{"a":2}"#.to_string(),
//! });
//! assert!(!out.is_identical);
//! assert_eq!(out.changed_count, 1);
//! ```

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use serde_json::{Value, to_string};

/// Input for the JSON diff tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonDiffInput {
    /// First JSON value (left side).
    pub left: String,
    /// Second JSON value (right side).
    pub right: String,
}

/// Type of change between left and right.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum ChangeType {
    /// Key exists in right but not in left.
    Added,
    /// Key exists in left but not in right.
    Removed,
    /// Same key, different value.
    Changed,
    /// Same key, different JSON type.
    TypeChanged,
}

/// A single diff change at a path.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DiffChange {
    /// Dot-notation path, e.g. "user.name", "items[0].price".
    pub path: String,
    pub change_type: ChangeType,
    /// JSON-serialised value on the left (None for Added).
    pub left_value: Option<String>,
    /// JSON-serialised value on the right (None for Removed).
    pub right_value: Option<String>,
}

/// Annotation for a single line in the diff view.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "JsonDiffLineAnnotation.ts")]
pub enum LineAnnotation {
    /// Line unchanged between left and right.
    Unchanged,
    /// Line only in right (added); right panel only.
    Added,
    /// Line only in left (removed); left panel only.
    Removed,
    /// Line present in both but value differs.
    Changed,
}

/// A single line in the annotated diff output.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "JsonDiffAnnotatedLine.ts")]
pub struct AnnotatedLine {
    pub line_number: usize,
    /// Line text without prefix.
    pub content: String,
    pub annotation: LineAnnotation,
}

/// Output from the JSON diff tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JsonDiffOutput {
    pub is_identical: bool,
    pub left_valid: bool,
    pub right_valid: bool,
    pub changes: Vec<DiffChange>,
    pub added_count: usize,
    pub removed_count: usize,
    pub changed_count: usize,
    pub unchanged_count: usize,
    pub left_annotated: Vec<AnnotatedLine>,
    pub right_annotated: Vec<AnnotatedLine>,
    pub error: Option<String>,
}

fn value_to_string(v: &Value) -> String {
    to_string(v).unwrap_or_else(|_| "null".to_string())
}

fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Object(_) => "object",
        Value::Array(_) => "array",
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Null => "null",
    }
}

fn path_join(parent: &str, segment: &str) -> String {
    if parent.is_empty() {
        segment.to_string()
    } else {
        format!("{parent}.{segment}")
    }
}

/// Emits pretty-printed lines with optional path (path set for key or element lines).
/// Format matches serde_json (2-space indent).
fn pretty_lines_with_paths(value: &Value, indent: usize, path: &str) -> Vec<(String, Option<String>)> {
    let indent_str = "  ".repeat(indent);
    let inner_indent = "  ".repeat(indent + 1);
    match value {
        Value::Object(map) => {
            let mut out = vec![(format!("{indent_str}{{"), None)];
            let keys: Vec<_> = map.keys().collect();
            for (i, k) in keys.iter().enumerate() {
                let key_path = path_join(path, k);
                let v = &map[*k];
                let is_last = i == keys.len() - 1;
                match v {
                    Value::Object(_inner_map) => {
                        out.push((
                            format!("{inner_indent}\"{}\": {{", k),
                            Some(key_path.clone()),
                        ));
                        let mut inner = pretty_lines_with_paths(v, indent + 2, &key_path);
                        inner.remove(0);
                        for (line, _) in &mut inner {
                            *line = format!("  {line}");
                        }
                        if let Some((last, _)) = inner.last_mut() {
                            *last = format!("  {last}");
                            if !is_last {
                                *last = last.replace('}', "},");
                            }
                        }
                        out.extend(inner);
                    }
                    Value::Array(_inner_arr) => {
                        out.push((
                            format!("{inner_indent}\"{}\": [", k),
                            Some(key_path.clone()),
                        ));
                        let mut inner = pretty_lines_with_paths(v, indent + 2, &key_path);
                        inner.remove(0);
                        for (line, _) in &mut inner {
                            *line = format!("  {line}");
                        }
                        if let Some((last, _)) = inner.last_mut() {
                            *last = format!("  {last}");
                            if !is_last {
                                *last = last.replace(']', "],");
                            }
                        }
                        out.extend(inner);
                    }
                    _ => {
                        let raw = to_string(v).unwrap_or_else(|_| "null".to_string());
                        let comma = if is_last { "" } else { "," };
                        out.push((format!("{inner_indent}\"{}\": {raw}{comma}", k), Some(key_path)));
                    }
                }
            }
            out.push((format!("{indent_str}}}"), None));
            out
        }
        Value::Array(arr) => {
            let mut out = vec![(format!("{indent_str}["), None)];
            for (i, v) in arr.iter().enumerate() {
                let elem_path = if path.is_empty() {
                    format!("[{i}]")
                } else {
                    format!("{}[{i}]", path)
                };
                let is_last = i == arr.len() - 1;
                match v {
                    Value::Object(_) => {
                        out.push((format!("{inner_indent}{{"), Some(elem_path.clone())));
                        let mut inner = pretty_lines_with_paths(v, indent + 2, &elem_path);
                        inner.remove(0);
                        for (line, _) in &mut inner {
                            *line = format!("  {line}");
                        }
                        if let Some((last, _)) = inner.last_mut() {
                            *last = format!("  {last}");
                            if !is_last {
                                *last = last.replace('}', "},");
                            }
                        }
                        out.extend(inner);
                    }
                    Value::Array(_) => {
                        out.push((format!("{inner_indent}["), Some(elem_path.clone())));
                        let mut inner = pretty_lines_with_paths(v, indent + 2, &elem_path);
                        inner.remove(0);
                        for (line, _) in &mut inner {
                            *line = format!("  {line}");
                        }
                        if let Some((last, _)) = inner.last_mut() {
                            *last = format!("  {last}");
                            if !is_last {
                                *last = last.replace(']', "],");
                            }
                        }
                        out.extend(inner);
                    }
                    _ => {
                        let raw = to_string(v).unwrap_or_else(|_| "null".to_string());
                        let comma = if is_last { "" } else { "," };
                        out.push((format!("{inner_indent}{raw}{comma}"), Some(elem_path)));
                    }
                }
            }
            out.push((format!("{indent_str}]"), None));
            out
        }
        _ => {
            let raw = to_string(value).unwrap_or_else(|_| "null".to_string());
            vec![(raw, if path.is_empty() { None } else { Some(path.to_string()) })]
        }
    }
}

fn diff_values(
    left: &Value,
    right: &Value,
    path: &str,
    changes: &mut Vec<DiffChange>,
    unchanged: &mut usize,
) {
    match (left, right) {
        (Value::Object(l_map), Value::Object(r_map)) => {
            for (k, l_val) in l_map {
                let child_path = path_join(path, k);
                match r_map.get(k) {
                    Some(r_val) => diff_values(l_val, r_val, &child_path, changes, unchanged),
                    None => {
                        changes.push(DiffChange {
                            path: child_path,
                            change_type: ChangeType::Removed,
                            left_value: Some(value_to_string(l_val)),
                            right_value: None,
                        });
                    }
                }
            }
            for (k, r_val) in r_map {
                if !l_map.contains_key(k) {
                    let child_path = path_join(path, k);
                    changes.push(DiffChange {
                        path: child_path,
                        change_type: ChangeType::Added,
                        left_value: None,
                        right_value: Some(value_to_string(r_val)),
                    });
                }
            }
        }
        (Value::Array(l_arr), Value::Array(r_arr)) => {
            let max_len = l_arr.len().max(r_arr.len());
            for i in 0..max_len {
                let child_path = if path.is_empty() {
                    format!("[{i}]")
                } else {
                    format!("{}[{i}]", path)
                };
                match (l_arr.get(i), r_arr.get(i)) {
                    (Some(l_val), Some(r_val)) => {
                        diff_values(l_val, r_val, &child_path, changes, unchanged);
                    }
                    (Some(l_val), None) => {
                        changes.push(DiffChange {
                            path: child_path,
                            change_type: ChangeType::Removed,
                            left_value: Some(value_to_string(l_val)),
                            right_value: None,
                        });
                    }
                    (None, Some(r_val)) => {
                        changes.push(DiffChange {
                            path: child_path,
                            change_type: ChangeType::Added,
                            left_value: None,
                            right_value: Some(value_to_string(r_val)),
                        });
                    }
                    (None, None) => {}
                }
            }
        }
        (l, r) if type_name(l) != type_name(r) => {
            changes.push(DiffChange {
                path: path.to_string(),
                change_type: ChangeType::TypeChanged,
                left_value: Some(value_to_string(l)),
                right_value: Some(value_to_string(r)),
            });
        }
        (l, r) => {
            if l == r {
                *unchanged += 1;
            } else {
                changes.push(DiffChange {
                    path: path.to_string(),
                    change_type: ChangeType::Changed,
                    left_value: Some(value_to_string(l)),
                    right_value: Some(value_to_string(r)),
                });
            }
        }
    }
}

/// Build path -> ChangeType map for changed paths (Changed and TypeChanged both become LineAnnotation::Changed).
fn path_to_change_type(changes: &[DiffChange]) -> std::collections::HashMap<String, ChangeType> {
    changes
        .iter()
        .map(|c| (c.path.clone(), c.change_type))
        .collect()
}

/// Build left/right annotated line arrays; pad to same length with empty Unchanged lines.
fn build_annotated_lines(
    left_lines: Vec<(String, Option<String>)>,
    right_lines: Vec<(String, Option<String>)>,
    path_to_type: &std::collections::HashMap<String, ChangeType>,
) -> (Vec<AnnotatedLine>, Vec<AnnotatedLine>) {
    let left_annotated: Vec<AnnotatedLine> = left_lines
        .into_iter()
        .enumerate()
        .map(|(i, (content, path_opt))| {
            let annotation = path_opt
                .as_ref()
                .and_then(|p| path_to_type.get(p))
                .map(|ct| match ct {
                    ChangeType::Removed => LineAnnotation::Removed,
                    ChangeType::Changed | ChangeType::TypeChanged => LineAnnotation::Changed,
                    ChangeType::Added => LineAnnotation::Unchanged,
                })
                .unwrap_or(LineAnnotation::Unchanged);
            AnnotatedLine {
                line_number: i + 1,
                content,
                annotation,
            }
        })
        .collect();

    let right_annotated: Vec<AnnotatedLine> = right_lines
        .into_iter()
        .enumerate()
        .map(|(i, (content, path_opt))| {
            let annotation = path_opt
                .as_ref()
                .and_then(|p| path_to_type.get(p))
                .map(|ct| match ct {
                    ChangeType::Added => LineAnnotation::Added,
                    ChangeType::Changed | ChangeType::TypeChanged => LineAnnotation::Changed,
                    ChangeType::Removed => LineAnnotation::Unchanged,
                })
                .unwrap_or(LineAnnotation::Unchanged);
            AnnotatedLine {
                line_number: i + 1,
                content,
                annotation,
            }
        })
        .collect();

    let max_len = left_annotated.len().max(right_annotated.len());
    let pad_line = |n: usize| AnnotatedLine {
        line_number: n + 1,
        content: String::new(),
        annotation: LineAnnotation::Unchanged,
    };

    let mut left = left_annotated;
    let mut right = right_annotated;
    while left.len() < max_len {
        left.push(pad_line(left.len()));
    }
    while right.len() < max_len {
        right.push(pad_line(right.len()));
    }
    (left, right)
}

/// Compare two JSON values and return diff output.
pub fn process(input: JsonDiffInput) -> JsonDiffOutput {
    let left_trimmed = input.left.trim();
    let right_trimmed = input.right.trim();

    if left_trimmed.is_empty() && right_trimmed.is_empty() {
        return JsonDiffOutput {
            is_identical: true,
            left_valid: true,
            right_valid: true,
            changes: vec![],
            added_count: 0,
            removed_count: 0,
            changed_count: 0,
            unchanged_count: 0,
            left_annotated: vec![],
            right_annotated: vec![],
            error: None,
        };
    }

    let left_parsed = serde_json::from_str::<Value>(left_trimmed);
    let right_parsed = serde_json::from_str::<Value>(right_trimmed);

    let (left_ok, right_ok) = (left_parsed.is_ok(), right_parsed.is_ok());

    if !left_ok || !right_ok {
        let mut error_parts = vec![];
        if !left_ok {
            error_parts.push("Left: invalid JSON");
        }
        if !right_ok {
            error_parts.push("Right: invalid JSON");
        }
        let left_lines: Vec<AnnotatedLine> = left_parsed
            .as_ref()
            .map(|v| {
                pretty_lines_with_paths(v, 0, "")
                    .into_iter()
                    .enumerate()
                    .map(|(i, (content, _))| AnnotatedLine {
                        line_number: i + 1,
                        content,
                        annotation: LineAnnotation::Unchanged,
                    })
                    .collect()
            })
            .unwrap_or_else(|_| {
                input
                    .left
                    .lines()
                    .enumerate()
                    .map(|(i, l)| AnnotatedLine {
                        line_number: i + 1,
                        content: l.to_string(),
                        annotation: LineAnnotation::Unchanged,
                    })
                    .collect()
            });
        let right_lines: Vec<AnnotatedLine> = right_parsed
            .as_ref()
            .map(|v| {
                pretty_lines_with_paths(v, 0, "")
                    .into_iter()
                    .enumerate()
                    .map(|(i, (content, _))| AnnotatedLine {
                        line_number: i + 1,
                        content,
                        annotation: LineAnnotation::Unchanged,
                    })
                    .collect()
            })
            .unwrap_or_else(|_| {
                input
                    .right
                    .lines()
                    .enumerate()
                    .map(|(i, l)| AnnotatedLine {
                        line_number: i + 1,
                        content: l.to_string(),
                        annotation: LineAnnotation::Unchanged,
                    })
                    .collect()
            });
        let max_len = left_lines.len().max(right_lines.len());
        let pad = |n: usize| AnnotatedLine {
            line_number: n + 1,
            content: String::new(),
            annotation: LineAnnotation::Unchanged,
        };
        let mut left_annotated = left_lines;
        let mut right_annotated = right_lines;
        while left_annotated.len() < max_len {
            left_annotated.push(pad(left_annotated.len()));
        }
        while right_annotated.len() < max_len {
            right_annotated.push(pad(right_annotated.len()));
        }
        return JsonDiffOutput {
            is_identical: false,
            left_valid: left_ok,
            right_valid: right_ok,
            changes: vec![],
            added_count: 0,
            removed_count: 0,
            changed_count: 0,
            unchanged_count: 0,
            left_annotated,
            right_annotated,
            error: Some(error_parts.join("; ")),
        };
    }

    let left_val = left_parsed.unwrap();
    let right_val = right_parsed.unwrap();

    let mut changes = vec![];
    let mut unchanged_count = 0usize;
    diff_values(&left_val, &right_val, "", &mut changes, &mut unchanged_count);

    let added_count = changes.iter().filter(|c| c.change_type == ChangeType::Added).count();
    let removed_count = changes.iter().filter(|c| c.change_type == ChangeType::Removed).count();
    let changed_count = changes
        .iter()
        .filter(|c| {
            c.change_type == ChangeType::Changed || c.change_type == ChangeType::TypeChanged
        })
        .count();

    let path_to_type = path_to_change_type(&changes);
    let left_with_paths = pretty_lines_with_paths(&left_val, 0, "");
    let right_with_paths = pretty_lines_with_paths(&right_val, 0, "");
    let (left_annotated, right_annotated) =
        build_annotated_lines(left_with_paths, right_with_paths, &path_to_type);

    let is_identical = changes.is_empty();

    JsonDiffOutput {
        is_identical,
        left_valid: true,
        right_valid: true,
        changes,
        added_count,
        removed_count,
        changed_count,
        unchanged_count,
        left_annotated,
        right_annotated,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical() {
        let json = r#"{"a":1,"b":2}"#;
        let out = process(JsonDiffInput {
            left: json.to_string(),
            right: json.to_string(),
        });
        assert!(out.is_identical);
        assert!(out.changes.is_empty());
        assert!(out.left_valid);
        assert!(out.right_valid);
    }

    #[test]
    fn added_key() {
        let out = process(JsonDiffInput {
            left: r#"{"a":1}"#.to_string(),
            right: r#"{"a":1,"b":2}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert_eq!(out.added_count, 1);
        assert!(out.changes.iter().any(|c| c.change_type == ChangeType::Added && c.path == "b"));
    }

    #[test]
    fn removed_key() {
        let out = process(JsonDiffInput {
            left: r#"{"a":1,"b":2}"#.to_string(),
            right: r#"{"a":1}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert_eq!(out.removed_count, 1);
        assert!(out.changes.iter().any(|c| c.change_type == ChangeType::Removed && c.path == "b"));
    }

    #[test]
    fn changed_value() {
        let out = process(JsonDiffInput {
            left: r#"{"a":1}"#.to_string(),
            right: r#"{"a":2}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert_eq!(out.changed_count, 1);
        assert!(out.changes.iter().any(|c| c.change_type == ChangeType::Changed && c.path == "a"));
    }

    #[test]
    fn type_changed() {
        let out = process(JsonDiffInput {
            left: r#"{"a":"hello"}"#.to_string(),
            right: r#"{"a":42}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert!(out.changes.iter().any(|c| c.change_type == ChangeType::TypeChanged));
    }

    #[test]
    fn nested_change() {
        let out = process(JsonDiffInput {
            left: r#"{"user":{"name":"John","role":"admin"}}"#.to_string(),
            right: r#"{"user":{"name":"John","role":"user"}}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert!(out.changes.iter().any(|c| c.path == "user.role"));
    }

    #[test]
    fn array_change() {
        let out = process(JsonDiffInput {
            left: r#"{"items":[1,2,3]}"#.to_string(),
            right: r#"{"items":[1,2,4]}"#.to_string(),
        });
        assert!(!out.is_identical);
        assert!(out.changes.iter().any(|c| c.path == "items[2]"));
    }

    #[test]
    fn both_invalid() {
        let out = process(JsonDiffInput {
            left: "not json".to_string(),
            right: "also not".to_string(),
        });
        assert!(!out.left_valid);
        assert!(!out.right_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn left_invalid() {
        let out = process(JsonDiffInput {
            left: "{ invalid".to_string(),
            right: r#"{}"#.to_string(),
        });
        assert!(!out.left_valid);
        assert!(out.right_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_both() {
        let out = process(JsonDiffInput {
            left: "".to_string(),
            right: "".to_string(),
        });
        assert!(out.is_identical);
        assert!(out.left_valid);
        assert!(out.right_valid);
    }

    #[test]
    fn annotated_lines() {
        let out = process(JsonDiffInput {
            left: r#"{"name":"John","age":30,"city":"NYC"}"#.to_string(),
            right: r#"{"name":"Jane","age":30,"country":"US"}"#.to_string(),
        });
        assert!(!out.is_identical);
        let left_non_unchanged = out
            .left_annotated
            .iter()
            .filter(|l| l.annotation != LineAnnotation::Unchanged)
            .count();
        let right_non_unchanged = out
            .right_annotated
            .iter()
            .filter(|l| l.annotation != LineAnnotation::Unchanged)
            .count();
        assert!(left_non_unchanged > 0, "left should have some Removed/Changed lines");
        assert!(right_non_unchanged > 0, "right should have some Added/Changed lines");
        assert_eq!(out.left_annotated.len(), out.right_annotated.len());
    }
}
