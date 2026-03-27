//! Line-by-line text diff using the Myers/LCS algorithm (via `similar` crate).

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use similar::{ChangeTag, TextDiff};

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextDiffInput {
    pub left: String,
    pub right: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "TextDiffLineAnnotation.ts")]
pub enum LineAnnotation {
    Unchanged,
    Added,
    Removed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "TextDiffAnnotatedLine.ts")]
pub struct AnnotatedLine {
    pub line_number: u32,
    pub content: String,
    pub annotation: LineAnnotation,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct TextDiffOutput {
    pub is_identical: bool,
    pub added_count: u32,
    pub removed_count: u32,
    pub unchanged_count: u32,
    pub left_annotated: Vec<AnnotatedLine>,
    pub right_annotated: Vec<AnnotatedLine>,
}

pub fn process(input: TextDiffInput) -> TextDiffOutput {
    let diff = TextDiff::from_lines(&input.left, &input.right);

    let mut left_annotated: Vec<AnnotatedLine> = Vec::new();
    let mut right_annotated: Vec<AnnotatedLine> = Vec::new();
    let mut added_count: u32 = 0;
    let mut removed_count: u32 = 0;
    let mut unchanged_count: u32 = 0;

    let mut left_line: u32 = 1;
    let mut right_line: u32 = 1;

    for change in diff.iter_all_changes() {
        let content = change.value().trim_end_matches('\n').to_string();
        match change.tag() {
            ChangeTag::Equal => {
                left_annotated.push(AnnotatedLine {
                    line_number: left_line,
                    content: content.clone(),
                    annotation: LineAnnotation::Unchanged,
                });
                right_annotated.push(AnnotatedLine {
                    line_number: right_line,
                    content,
                    annotation: LineAnnotation::Unchanged,
                });
                left_line += 1;
                right_line += 1;
                unchanged_count += 1;
            }
            ChangeTag::Delete => {
                left_annotated.push(AnnotatedLine {
                    line_number: left_line,
                    content,
                    annotation: LineAnnotation::Removed,
                });
                left_line += 1;
                removed_count += 1;
            }
            ChangeTag::Insert => {
                right_annotated.push(AnnotatedLine {
                    line_number: right_line,
                    content,
                    annotation: LineAnnotation::Added,
                });
                right_line += 1;
                added_count += 1;
            }
        }
    }

    let is_identical = added_count == 0 && removed_count == 0;

    TextDiffOutput {
        is_identical,
        added_count,
        removed_count,
        unchanged_count,
        left_annotated,
        right_annotated,
    }
}

