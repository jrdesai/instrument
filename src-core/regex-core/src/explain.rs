use regex_syntax::hir::{Capture, Class, Hir, HirKind, Look, Repetition};
use regex_syntax::ParserBuilder;

use crate::types::{ExplainRequest, ExplainToken};

/// Returns a user-friendly message for common regex parse errors.
fn friendly_parse_error(err: &regex_syntax::Error) -> String {
    let msg = err.to_string();
    if msg.contains("incomplete escape sequence")
        || msg.contains("reached end of pattern prematurely")
    {
        return "Pattern has an incomplete escape (e.g. a trailing backslash \\ with nothing after it).".into();
    }
    format!("Parse error: {}", err)
}

pub fn run(req: &ExplainRequest) -> Result<Vec<ExplainToken>, String> {
    let hir = match req.engine.as_str() {
        "rust" | "go" => {
            regex_syntax::Parser::new()
                .parse(&req.pattern)
                .map_err(|e| friendly_parse_error(&e))?
        }
        _ => ParserBuilder::new()
            .unicode(true)
            .utf8(true)
            .build()
            .parse(&req.pattern)
            .map_err(|e| friendly_parse_error(&e))?,
    };

    let mut tokens: Vec<ExplainToken> = Vec::new();
    walk_hir(&hir, 0, &mut tokens);
    Ok(tokens)
}

fn walk_hir(hir: &Hir, depth: u32, tokens: &mut Vec<ExplainToken>) {
    match hir.kind() {
        HirKind::Empty => {
            tokens.push(ExplainToken {
                kind: "meta".into(),
                label: "(empty)".into(),
                description: "Matches the empty string".into(),
                depth,
            });
        }

        HirKind::Literal(lit) => {
            let text = String::from_utf8_lossy(&lit.0).to_string();
            let escaped = regex_escape(&text);
            tokens.push(ExplainToken {
                kind: "literal".into(),
                label: escaped,
                description: format!("Literal \"{}\"", text),
                depth,
            });
        }

        HirKind::Class(class) => {
            let (label, description) = describe_class(class);
            tokens.push(ExplainToken {
                kind: "class".into(),
                label,
                description,
                depth,
            });
        }

        HirKind::Look(look) => {
            let (label, description) = describe_look(*look);
            tokens.push(ExplainToken {
                kind: "anchor".into(),
                label,
                description,
                depth,
            });
        }

        HirKind::Repetition(rep) => {
            walk_hir(&rep.sub, depth, tokens);
            let (label, description) = describe_repetition(rep);
            tokens.push(ExplainToken {
                kind: "quantifier".into(),
                label,
                description,
                depth,
            });
        }

        HirKind::Capture(cap) => {
            let (label, description) = describe_capture(cap);
            tokens.push(ExplainToken {
                kind: "group".into(),
                label,
                description,
                depth,
            });
            walk_hir(&cap.sub, depth.saturating_add(1), tokens);
            tokens.push(ExplainToken {
                kind: "group_end".into(),
                label: ")".into(),
                description: "End of group".into(),
                depth,
            });
        }

        HirKind::Concat(hirs) => {
            for h in hirs {
                walk_hir(h, depth, tokens);
            }
        }

        HirKind::Alternation(hirs) => {
            tokens.push(ExplainToken {
                kind: "alternation".into(),
                label: "|".into(),
                description: "Alternation — match either branch".into(),
                depth,
            });
            for (i, h) in hirs.iter().enumerate() {
                if i > 0 {
                    tokens.push(ExplainToken {
                        kind: "alternation".into(),
                        label: "|".into(),
                        description: "Or".into(),
                        depth,
                    });
                }
                walk_hir(h, depth.saturating_add(1), tokens);
            }
        }
    }
}

fn describe_class(class: &Class) -> (String, String) {
    match class {
        Class::Unicode(cls) => {
            let ranges: Vec<_> = cls.iter().collect();

            // Fingerprint common shorthands by first range, last range,
            // and approximate range count rather than exact range content,
            // since regex-syntax expands \d/\w/\s to full Unicode sets.

            if let (Some(first), Some(last)) = (ranges.first(), ranges.last()) {
                let fs = first.start();
                let fe = first.end();
                let ls = last.start();
                let le = last.end();
                let n = ranges.len();

                // \d — Unicode digits: first range is '0'-'9', last is
                // U+1FBF0-U+1FBF9 (🯰-🯹), many ranges
                if fs == '0' && fe == '9' && ls == '\u{1FBF0}' && le == '\u{1FBF9}' {
                    return ("\\d".into(), "Any Unicode digit".into());
                }

                // \D — complement of \d: first range starts at U+0000
                if fs == '\0' && n > 10 {
                    // Heuristic: \D starts at null, has many ranges
                    // Only use if pattern of ranges suggests digit complement
                    // Check that '0'-'9' is NOT in first range (it's excluded)
                    if fe < '0' {
                        return ("\\D".into(), "Any non-digit character".into());
                    }
                }

                // \s — Unicode whitespace: first range is '\t'-'\r' (tab to CR)
                if fs == '\t' && fe == '\r' && n <= 6 {
                    return ("\\s".into(), "Any whitespace character".into());
                }

                // \S — complement of \s: starts at U+0000, ends at U+10FFFF,
                // many ranges
                if fs == '\0' && le == '\u{10FFFF}' && n > 6 {
                    return ("\\S".into(), "Any non-whitespace character".into());
                }

                // \w — Unicode word char: starts at '0' with many ranges
                // \w includes digits, letters, underscore across all scripts
                if fs == '0' && fe == '9' && n > 20 {
                    return (
                        "\\w".into(),
                        "Any word character [a-zA-Z0-9_] and Unicode equivalents".into(),
                    );
                }

                // \W — complement of \w
                if fs == '\0' && fe < '0' && n > 20 {
                    return ("\\W".into(), "Any non-word character".into());
                }

                // Single char
                if ranges.len() == 1 && fs == fe {
                    return (format!("{}", fs), format!("Literal '{}'", fs));
                }

                // Simple single range
                if ranges.len() == 1 {
                    return match (fs, fe) {
                        ('0', '9') => ("\\d".into(), "Any digit [0-9]".into()),
                        ('a', 'z') => ("[a-z]".into(), "Lowercase ASCII letter".into()),
                        ('A', 'Z') => ("[A-Z]".into(), "Uppercase ASCII letter".into()),
                        _ => (
                            format!("[{}-{}]", fs, fe),
                            format!("Character range '{}'–'{}'", fs, fe),
                        ),
                    };
                }

                // Small explicit class — render it
                if ranges.len() <= 6 {
                    let label = format!(
                        "[{}]",
                        ranges
                            .iter()
                            .map(|r| {
                                let s = r.start();
                                let e = r.end();
                                if s == e {
                                    format!("{}", s)
                                } else {
                                    format!("{}-{}", s, e)
                                }
                            })
                            .collect::<Vec<_>>()
                            .join("")
                    );
                    return (label.clone(), format!("Character class {}", label));
                }
            }

            // Fallback for large unrecognised classes
            (
                format!("[{} ranges]", ranges.len()),
                format!("Character class ({} Unicode ranges)", ranges.len()),
            )
        }

        Class::Bytes(cls) => {
            let ranges: Vec<_> = cls.iter().collect();
            if ranges.len() == 1 {
                let r = ranges[0];
                if r.start() == r.end() {
                    return (
                        format!("0x{:02X}", r.start()),
                        format!("Byte 0x{:02X}", r.start()),
                    );
                }
            }
            let label = format!("[bytes: {} ranges]", ranges.len());
            (label.clone(), "Byte character class".into())
        }
    }
}

fn describe_look(look: Look) -> (String, String) {
    match look {
        Look::Start => ("^".into(), "Start of string".into()),
        Look::End => ("$".into(), "End of string".into()),
        Look::StartLF => ("^".into(), "Start of line (multiline)".into()),
        Look::EndLF => ("$".into(), "End of line (multiline)".into()),
        Look::WordAscii => ("\\b".into(), "Word boundary".into()),
        Look::WordAsciiNegate => ("\\B".into(), "Non-word boundary".into()),
        Look::WordUnicode => ("\\b".into(), "Unicode word boundary".into()),
        Look::WordUnicodeNegate => ("\\B".into(), "Unicode non-word boundary".into()),
        _ => ("(?...)".into(), "Lookaround assertion".into()),
    }
}

fn describe_repetition(rep: &Repetition) -> (String, String) {
    let greedy = if rep.greedy { "greedy" } else { "lazy" };
    let min = rep.min;
    let max = rep.max;
    if min == 0 && max == Some(1) {
        ("?".into(), format!("Optional — 0 or 1 times ({})", greedy))
    } else if min == 0 && max.is_none() {
        ("*".into(), format!("0 or more times ({})", greedy))
    } else if min == 1 && max.is_none() {
        ("+".into(), format!("1 or more times ({})", greedy))
    } else if let Some(n) = max {
        if n == min {
            (format!("{{{}}}", min), format!("Exactly {} times", min))
        } else {
            (
                format!("{{{},{}}}", min, n),
                format!("Between {} and {} times ({})", min, n, greedy),
            )
        }
    } else {
        (
            format!("{{{},}}", min),
            format!("At least {} times ({})", min, greedy),
        )
    }
}

fn describe_capture(cap: &Capture) -> (String, String) {
    if let Some(ref name) = cap.name {
        (
            "(?P<...>".into(),
            format!("Named capture group \"{}\"", name),
        )
    } else {
        ("(".into(), format!("Capture group {}", cap.index))
    }
}

fn regex_escape(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '.' | '^' | '$' | '*' | '+' | '?' | '(' | ')' | '[' | ']' | '{' | '}' | '|' | '\\' => {
                format!("\\{}", c)
            }
            c => c.to_string(),
        })
        .collect()
}
