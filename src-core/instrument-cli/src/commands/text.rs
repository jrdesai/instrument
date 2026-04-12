use clap::{Args, ValueEnum};
use instrument_core::text::{case, line_tools, word_counter};

use crate::{input, output};

// ── Case ──────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum CaseVariant {
    Upper,
    Lower,
    Title,
    Camel,
    Pascal,
    Snake,
    Kebab,
    Screaming,
}

#[derive(Args)]
pub struct CaseArgs {
    pub variant: CaseVariant,
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_case(args: CaseArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "case"));
    let result = case::process(case::CaseInput { text: inp });
    let s = match args.variant {
        CaseVariant::Upper => &result.upper_case,
        CaseVariant::Lower => &result.lower_case,
        CaseVariant::Title => &result.title_case,
        CaseVariant::Camel => &result.camel_case,
        CaseVariant::Pascal => &result.pascal_case,
        CaseVariant::Snake => &result.snake_case,
        CaseVariant::Kebab => &result.kebab_case,
        CaseVariant::Screaming => &result.screaming_case,
    };
    output::print_ok(s, json, "case");
}

// ── Lines ─────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct LinesArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long)]
    pub sort: bool,
    #[arg(long)]
    pub dedupe: bool,
    #[arg(long)]
    pub reverse: bool,
    #[arg(long)]
    pub trim: bool,
    #[arg(long)]
    pub remove_empty: bool,
}

pub fn run_lines(args: LinesArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "lines"));
    let mut operations = Vec::new();
    if args.trim {
        operations.push(line_tools::LineOperation::TrimWhitespace);
    }
    if args.remove_empty {
        operations.push(line_tools::LineOperation::RemoveEmpty);
    }
    if args.sort {
        operations.push(line_tools::LineOperation::SortAsc);
    }
    if args.dedupe {
        operations.push(line_tools::LineOperation::Deduplicate);
    }
    if args.reverse {
        operations.push(line_tools::LineOperation::Reverse);
    }
    let result = line_tools::process(line_tools::LineToolsInput {
        text: inp,
        operations,
        keep_first: true,
        case_insensitive: true,
    });
    output::print_ok(&result.result, json, "lines");
}

// ── Word Count ────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct WordCountArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_word_count(args: WordCountArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "word-count"));
    let result = word_counter::process(word_counter::WordCounterInput { text: inp });
    if json {
        println!(
            "{}",
            serde_json::json!({
                "ok": true, "tool": "word-count",
                "words": result.words,
                "characters": result.characters_with_spaces,
                "lines": result.lines,
                "sentences": result.sentences,
            })
        );
    } else {
        println!("Words:      {}", result.words);
        println!("Characters: {}", result.characters_with_spaces);
        println!("Lines:      {}", result.lines);
        println!("Sentences:  {}", result.sentences);
    }
}
