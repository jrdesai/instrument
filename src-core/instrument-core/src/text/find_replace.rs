//! Find and replace in text. Supports plain text (literal find) and regex mode.
//!
//! Options: case sensitive, whole word, replace first or all. Empty find returns
//! text unchanged with zero counts.

use regex::{escape as regex_escape, NoExpand, Regex};
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Find & Replace tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FindReplaceInput {
    pub text: String,
    pub find: String,
    pub replace: String,
    pub case_sensitive: bool,
    pub whole_word: bool,
    pub regex_mode: bool,
    pub replace_all: bool,
}

/// Output: result string, total matches found, number replaced, match ranges, optional error.
/// match_ranges: [start_byte, end_byte] of each match in the ORIGINAL text.
/// Empty when find is empty, no matches, or on error.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct FindReplaceOutput {
    pub result: String,
    pub match_count: u32,
    pub replaced_count: u32,
    pub match_ranges: Vec<[u32; 2]>,
    pub error: Option<String>,
}

/// Run find and replace.
///
/// # Example
///
/// ```
/// use instrument_core::text::find_replace::{
///     process, FindReplaceInput,
/// };
///
/// let out = process(FindReplaceInput {
///     text: "the cat sat".to_string(),
///     find: "cat".to_string(),
///     replace: "dog".to_string(),
///     case_sensitive: false,
///     whole_word: false,
///     regex_mode: false,
///     replace_all: true,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.result, "the dog sat");
/// assert_eq!(out.match_count, 1);
/// assert_eq!(out.replaced_count, 1);
/// ```
pub fn process(input: FindReplaceInput) -> FindReplaceOutput {
    if input.find.is_empty() {
        return FindReplaceOutput {
            result: input.text,
            match_count: 0,
            replaced_count: 0,
            match_ranges: Vec::new(),
            error: None,
        };
    }
    if input.text.is_empty() {
        return FindReplaceOutput {
            result: String::new(),
            match_count: 0,
            replaced_count: 0,
            match_ranges: Vec::new(),
            error: None,
        };
    }

    let pattern = if input.regex_mode {
        input.find.clone()
    } else {
        let escaped = regex_escape(&input.find);
        let case_flag = if input.case_sensitive { "(?-i)" } else { "(?i)" };
        let word_wrap = if input.whole_word {
            format!("{}\\b{}\\b", case_flag, escaped)
        } else {
            format!("{}{}", case_flag, escaped)
        };
        word_wrap
    };

    let re = match Regex::new(&pattern) {
        Ok(r) => r,
        Err(e) => {
            return FindReplaceOutput {
                result: input.text,
                match_count: 0,
                replaced_count: 0,
                match_ranges: Vec::new(),
                error: Some(format!("Invalid regex: {}", e)),
            };
        }
    };

    let mut match_ranges: Vec<[u32; 2]> = Vec::new();
    for m in re.find_iter(&input.text) {
        match_ranges.push([
            u32::try_from(m.start()).unwrap_or(u32::MAX),
            u32::try_from(m.end()).unwrap_or(u32::MAX),
        ]);
    }
    let match_count = u32::try_from(match_ranges.len()).unwrap_or(u32::MAX);

    let result = if input.replace_all {
        re.replace_all(&input.text, NoExpand(&input.replace))
            .into_owned()
    } else {
        re.replacen(&input.text, 1, NoExpand(&input.replace))
            .into_owned()
    };

    let replaced_count = if input.replace_all {
        match_count
    } else {
        match_count.min(1)
    };

    FindReplaceOutput {
        result,
        match_count,
        replaced_count,
        match_ranges,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_replace() {
        let out = process(FindReplaceInput {
            text: "the cat sat".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "the dog sat");
        assert_eq!(out.match_count, 1);
        assert_eq!(out.replaced_count, 1);
    }

    #[test]
    fn replace_all() {
        let out = process(FindReplaceInput {
            text: "cat and cat".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "dog and dog");
        assert_eq!(out.match_count, 2);
        assert_eq!(out.replaced_count, 2);
    }

    #[test]
    fn replace_first() {
        let out = process(FindReplaceInput {
            text: "cat and cat".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "dog and cat");
        assert_eq!(out.match_count, 2);
        assert_eq!(out.replaced_count, 1);
    }

    #[test]
    fn case_insensitive() {
        let out = process(FindReplaceInput {
            text: "Cat and CAT and cat".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "dog and dog and dog");
        assert_eq!(out.match_count, 3);
        assert_eq!(out.replaced_count, 3);
    }

    #[test]
    fn case_sensitive() {
        let out = process(FindReplaceInput {
            text: "Cat and cat".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: true,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "Cat and dog");
        assert_eq!(out.match_count, 1);
        assert_eq!(out.replaced_count, 1);
    }

    #[test]
    fn whole_word() {
        let out = process(FindReplaceInput {
            text: "cat concatenate".to_string(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: true,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "dog concatenate");
        assert_eq!(out.match_count, 1);
        assert_eq!(out.replaced_count, 1);
    }

    #[test]
    fn regex_mode() {
        let out = process(FindReplaceInput {
            text: "price is 100 and quantity is 50".to_string(),
            find: r"\d+".to_string(),
            replace: "NUM".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: true,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "price is NUM and quantity is NUM");
        assert_eq!(out.match_count, 2);
        assert_eq!(out.replaced_count, 2);
    }

    #[test]
    fn invalid_regex() {
        let out = process(FindReplaceInput {
            text: "hello".to_string(),
            find: "[invalid".to_string(),
            replace: "x".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: true,
            replace_all: true,
        });
        assert!(out.error.is_some());
        assert!(out.error.unwrap().contains("Invalid regex"));
        assert_eq!(out.result, "hello");
        assert_eq!(out.match_count, 0);
        assert_eq!(out.replaced_count, 0);
    }

    #[test]
    fn empty_find() {
        let out = process(FindReplaceInput {
            text: "hello world".to_string(),
            find: String::new(),
            replace: "x".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "hello world");
        assert_eq!(out.match_count, 0);
        assert_eq!(out.replaced_count, 0);
    }

    #[test]
    fn empty_text() {
        let out = process(FindReplaceInput {
            text: String::new(),
            find: "cat".to_string(),
            replace: "dog".to_string(),
            case_sensitive: false,
            whole_word: false,
            regex_mode: false,
            replace_all: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.result, "");
        assert_eq!(out.match_count, 0);
        assert_eq!(out.replaced_count, 0);
    }
}
