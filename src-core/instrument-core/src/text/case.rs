//! Text case conversion utilities.
//!
//! Splits input into words, then produces multiple case variants at once
//! (camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE, kebab-case, etc.).

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input for the Text Case Converter tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CaseInput {
    pub text: String,
}

/// Output for the Text Case Converter tool: all case variants at once.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CaseOutput {
    pub camel_case: String,
    pub pascal_case: String,
    pub snake_case: String,
    pub screaming_case: String,
    pub kebab_case: String,
    pub title_case: String,
    pub upper_case: String,
    pub lower_case: String,
    pub dot_case: String,
    pub path_case: String,
    pub word_count: u32,
    pub error: Option<String>,
}

fn split_words(input: &str) -> Vec<String> {
    if input.is_empty() {
        return Vec::new();
    }

    // Normalize separators to spaces.
    let mut cleaned = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_whitespace() || matches!(ch, '_' | '-' | '.' | '/' | '\\') {
            cleaned.push(' ');
        } else {
            cleaned.push(ch);
        }
    }

    let mut words: Vec<String> = Vec::new();

    for token in cleaned.split_whitespace() {
        if token.is_empty() {
            continue;
        }
        // Further split by camelCase / PascalCase boundaries while preserving acronyms.
        let chars: Vec<(usize, char)> = token.char_indices().collect();
        if chars.is_empty() {
            continue;
        }
        let mut start = 0;
        for i in 1..chars.len() {
            let (_, c) = chars[i];
            let (_, prev) = chars[i - 1];
            let next = chars.get(i + 1).map(|(_, ch)| *ch);

            let break_here = (prev.is_lowercase() && c.is_uppercase())
                || (prev.is_uppercase()
                    && c.is_uppercase()
                    && next.map(|n| n.is_lowercase()).unwrap_or(false));

            if break_here {
                let (start_idx, _) = chars[start];
                let end_idx = chars[i].0;
                let segment = &token[start_idx..end_idx];
                if !segment.is_empty() {
                    words.push(segment.to_lowercase());
                }
                start = i;
            }
        }
        let (start_idx, _) = chars[start];
        let segment = &token[start_idx..];
        if !segment.is_empty() {
            words.push(segment.to_lowercase());
        }
    }

    words
}

fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    let first = match chars.next() {
        Some(c) => c,
        None => return String::new(),
    };
    let mut result = String::with_capacity(word.len());
    result.extend(first.to_uppercase());
    for c in chars {
        result.extend(c.to_lowercase());
    }
    result
}

/// Convert text into multiple case formats at once.
///
/// Empty input returns empty strings for all formats and word_count 0.
///
/// # Example
///
/// ```
/// use instrument_core::text::case::{process, CaseInput};
///
/// let out = process(CaseInput {
///     text: "hello world".to_string(),
/// });
/// assert_eq!(out.camel_case, "helloWorld");
/// assert_eq!(out.snake_case, "hello_world");
/// assert_eq!(out.word_count, 2);
/// ```
pub fn process(input: CaseInput) -> CaseOutput {
    let words = split_words(&input.text);
    let word_count = words.len();

    if word_count == 0 {
        return CaseOutput {
            camel_case: String::new(),
            pascal_case: String::new(),
            snake_case: String::new(),
            screaming_case: String::new(),
            kebab_case: String::new(),
            title_case: String::new(),
            upper_case: String::new(),
            lower_case: String::new(),
            dot_case: String::new(),
            path_case: String::new(),
            word_count: 0,
            error: None,
        };
    }

    let mut camel = String::new();
    let mut pascal = String::new();
    let mut snake = String::new();
    let mut screaming = String::new();
    let mut kebab = String::new();
    let mut title = String::new();
    let mut dot = String::new();
    let mut path = String::new();

    for (i, w) in words.iter().enumerate() {
        if i > 0 {
            snake.push('_');
            screaming.push('_');
            kebab.push('-');
            title.push(' ');
            dot.push('.');
            path.push('/');
        }

        let cap = capitalize(w);

        if i == 0 {
            camel.push_str(w);
        } else {
            camel.push_str(&cap);
        }

        pascal.push_str(&cap);
        snake.push_str(w);
        screaming.push_str(&w.to_uppercase());
        kebab.push_str(w);
        title.push_str(&cap);
        dot.push_str(w);
        path.push_str(w);
    }

    let joined_space = words.join(" ");

    CaseOutput {
        camel_case: camel,
        pascal_case: pascal,
        snake_case: snake,
        screaming_case: screaming,
        kebab_case: kebab,
        title_case: title,
        upper_case: joined_space.to_uppercase(),
        lower_case: joined_space.to_lowercase(),
        dot_case: dot,
        path_case: path,
        word_count: u32::try_from(word_count).unwrap_or(u32::MAX),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snake_to_camel() {
        let out = process(CaseInput {
            text: "hello_world".to_string(),
        });
        assert_eq!(out.camel_case, "helloWorld");
    }

    #[test]
    fn camel_to_snake() {
        let out = process(CaseInput {
            text: "helloWorld".to_string(),
        });
        assert_eq!(out.snake_case, "hello_world");
    }

    #[test]
    fn pascal_to_kebab() {
        let out = process(CaseInput {
            text: "HelloWorld".to_string(),
        });
        assert_eq!(out.kebab_case, "hello-world");
    }

    #[test]
    fn screaming_to_title() {
        let out = process(CaseInput {
            text: "HELLO_WORLD".to_string(),
        });
        assert_eq!(out.title_case, "Hello World");
    }

    #[test]
    fn spaces_to_dot() {
        let out = process(CaseInput {
            text: "hello world".to_string(),
        });
        assert_eq!(out.dot_case, "hello.world");
    }

    #[test]
    fn mixed_input_all_formats() {
        let out = process(CaseInput {
            text: "hello-world_example test".to_string(),
        });
        assert_eq!(out.camel_case, "helloWorldExampleTest");
        assert_eq!(out.pascal_case, "HelloWorldExampleTest");
        assert_eq!(out.snake_case, "hello_world_example_test");
        assert_eq!(out.screaming_case, "HELLO_WORLD_EXAMPLE_TEST");
        assert_eq!(out.kebab_case, "hello-world-example-test");
        assert_eq!(out.title_case, "Hello World Example Test");
        assert_eq!(out.upper_case, "HELLO WORLD EXAMPLE TEST");
        assert_eq!(out.lower_case, "hello world example test");
        assert_eq!(out.dot_case, "hello.world.example.test");
        assert_eq!(out.path_case, "hello/world/example/test");
        assert_eq!(out.word_count, 4);
    }

    #[test]
    fn empty_input() {
        let out = process(CaseInput {
            text: "".to_string(),
        });
        assert_eq!(out.camel_case, "");
        assert_eq!(out.word_count, 0);
    }

    #[test]
    fn single_word_all_formats() {
        let out = process(CaseInput {
            text: "hello".to_string(),
        });
        assert_eq!(out.camel_case, "hello");
        assert_eq!(out.pascal_case, "Hello");
        assert_eq!(out.snake_case, "hello");
        assert_eq!(out.screaming_case, "HELLO");
        assert_eq!(out.kebab_case, "hello");
        assert_eq!(out.title_case, "Hello");
        assert_eq!(out.upper_case, "HELLO");
        assert_eq!(out.lower_case, "hello");
        assert_eq!(out.dot_case, "hello");
        assert_eq!(out.path_case, "hello");
        assert_eq!(out.word_count, 1);
    }

    #[test]
    fn acronym_handling() {
        let out = process(CaseInput {
            text: "parseHTML".to_string(),
        });
        assert_eq!(out.camel_case, "parseHtml");
        assert_eq!(out.snake_case, "parse_html");
        assert_eq!(out.kebab_case, "parse-html");
    }
}

