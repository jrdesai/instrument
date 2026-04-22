use clap::{Args, ValueEnum};
use instrument_core::text::{case, diff, env_parser, fake_data, find_replace, line_tools, lorem_ipsum, nato_phonetic, string_escaper, unicode, word_counter};

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

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum EscapeArgMode {
    Escape,
    Unescape,
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum EscapeArgTarget {
    Json,
    Regex,
    Html,
    Sql,
    Shell,
    Csv,
}

#[derive(Args)]
pub struct EscapeArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, value_enum, default_value_t = EscapeArgMode::Escape)]
    pub mode: EscapeArgMode,
    #[arg(long, value_enum, default_value_t = EscapeArgTarget::Json)]
    pub target: EscapeArgTarget,
}

pub fn run_escape(args: EscapeArgs, json: bool) {
    let text = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "escape"));
    let mode = match args.mode { EscapeArgMode::Escape => string_escaper::EscapeMode::Escape, EscapeArgMode::Unescape => string_escaper::EscapeMode::Unescape };
    let target = match args.target {
        EscapeArgTarget::Json => string_escaper::EscapeTarget::Json,
        EscapeArgTarget::Regex => string_escaper::EscapeTarget::Regex,
        EscapeArgTarget::Html => string_escaper::EscapeTarget::Html,
        EscapeArgTarget::Sql => string_escaper::EscapeTarget::Sql,
        EscapeArgTarget::Shell => string_escaper::EscapeTarget::Shell,
        EscapeArgTarget::Csv => string_escaper::EscapeTarget::Csv,
    };
    let out = string_escaper::process(string_escaper::StringEscaperInput { text, mode, target });
    if let Some(e) = out.error { output::print_err(&e, json, "escape"); }
    output::print_ok(&out.result, json, "escape");
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum NatoModeArg { Encode, Decode }
#[derive(Args)]
pub struct NatoArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, value_enum, default_value_t = NatoModeArg::Encode)]
    pub mode: NatoModeArg,
}
pub fn run_nato(args: NatoArgs, json: bool) {
    let text = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "nato"));
    let mode = match args.mode { NatoModeArg::Encode => nato_phonetic::NatoPhoneticMode::Encode, NatoModeArg::Decode => nato_phonetic::NatoPhoneticMode::Decode };
    let out = nato_phonetic::process(nato_phonetic::NatoPhoneticInput { text, mode });
    if let Some(e) = out.error { output::print_err(&e, json, "nato"); }
    output::print_ok(&out.result, json, "nato");
}

#[derive(Args)]
pub struct ReplaceArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long)]
    pub find: String,
    #[arg(long, default_value = "")]
    pub replace: String,
    #[arg(long)]
    pub regex: bool,
    #[arg(long)]
    pub case_sensitive: bool,
    #[arg(long)]
    pub first: bool,
}
pub fn run_replace(args: ReplaceArgs, json: bool) {
    let text = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "replace"));
    let out = find_replace::process(find_replace::FindReplaceInput {
        text, find: args.find, replace: args.replace, case_sensitive: args.case_sensitive,
        whole_word: false, regex_mode: args.regex, replace_all: !args.first,
    });
    if let Some(e) = out.error.clone() { output::print_err(&e, json, "replace"); }
    if json {
        println!("{}", serde_json::json!({"ok": true, "tool":"replace", "output": out.result, "match_count": out.match_count, "replaced_count": out.replaced_count}));
    } else {
        output::print_ok(&out.result, false, "replace");
    }
}

#[derive(Args)]
pub struct DiffArgs {
    #[arg(long)]
    pub left: Option<String>,
    #[arg(long)]
    pub right: Option<String>,
    #[arg(long)]
    pub left_file: Option<std::path::PathBuf>,
    #[arg(long)]
    pub right_file: Option<std::path::PathBuf>,
}
pub fn run_diff(args: DiffArgs, json: bool) {
    let left = input::resolve(args.left, args.left_file).unwrap_or_else(|e| output::print_err(&e, json, "diff"));
    let right = input::resolve(args.right, args.right_file).unwrap_or_else(|e| output::print_err(&e, json, "diff"));
    let out = diff::process(diff::TextDiffInput { left, right, granularity: diff::DiffGranularity::Line });
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"diff", "output": out})).unwrap_or_default());
    } else {
        for l in out.left_annotated { if l.annotation != diff::LineAnnotation::Unchanged { println!("- {}", l.content); } }
        for r in out.right_annotated { if r.annotation != diff::LineAnnotation::Unchanged { println!("+ {}", r.content); } }
    }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum LoremTypeArg { Paragraphs, Sentences, Words }
#[derive(Args)]
pub struct LoremArgs {
    #[arg(long = "type", value_enum, default_value_t = LoremTypeArg::Paragraphs)]
    pub output_type: LoremTypeArg,
    #[arg(long, default_value_t = 1)]
    pub count: u32,
    #[arg(long = "no-classic")]
    pub no_classic: bool,
}
pub fn run_lorem(args: LoremArgs, json: bool) {
    let output_type = match args.output_type { LoremTypeArg::Paragraphs => lorem_ipsum::LoremOutputType::Paragraphs, LoremTypeArg::Sentences => lorem_ipsum::LoremOutputType::Sentences, LoremTypeArg::Words => lorem_ipsum::LoremOutputType::Words };
    let out = lorem_ipsum::process(lorem_ipsum::LoremIpsumInput { output_type, count: args.count, start_with_classic: !args.no_classic });
    if let Some(e) = out.error { output::print_err(&e, json, "lorem"); }
    output::print_ok(&out.result, json, "lorem");
}

#[derive(Args)]
pub struct UnicodeArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}
pub fn run_unicode(args: UnicodeArgs, json: bool) {
    let text = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "unicode"));
    let out = unicode::process(unicode::UnicodeInspectInput { text });
    if let Some(e) = out.error.clone() { output::print_err(&e, json, "unicode"); }
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"unicode", "output": out.chars})).unwrap_or_default());
    } else {
        for c in out.chars {
            println!("{}  {}  {}  {}", c.hex, c.ch, c.name, c.category);
        }
    }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum EnvFormatArg { Auto, Env, Properties, Ini }
#[derive(Args)]
pub struct EnvArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, value_enum, default_value_t = EnvFormatArg::Auto)]
    pub format: EnvFormatArg,
    #[arg(long)]
    pub mask: bool,
}
pub fn run_env(args: EnvArgs, json: bool) {
    let content = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "env"));
    let format = match args.format { EnvFormatArg::Auto => env_parser::EnvFileFormat::Auto, EnvFormatArg::Env => env_parser::EnvFileFormat::Env, EnvFormatArg::Properties => env_parser::EnvFileFormat::Properties, EnvFormatArg::Ini => env_parser::EnvFileFormat::Ini };
    let out = env_parser::process(env_parser::EnvParseInput { content, format, mask_values: args.mask });
    if json {
        println!("{}", serde_json::to_string(&serde_json::json!({"ok": true, "tool":"env", "output": out.entries})).unwrap_or_default());
    } else {
        for e in out.entries { if !e.is_comment && !e.is_section { println!("{}={}", e.key, e.value); } }
    }
}

#[derive(Args)]
pub struct FakeArgs {
    #[arg(long)]
    pub fields: String,
    #[arg(long, default_value_t = 1)]
    pub count: usize,
}
pub fn run_fake(args: FakeArgs, _json: bool) {
    let fields = args.fields.split(',').filter_map(|pair| pair.split_once(':')).map(|(k,v)| fake_data::FakeField { name: k.to_string(), field_type: v.to_string(), params: None }).collect::<Vec<_>>();
    let out = fake_data::process(fake_data::FakeDataInput { fields, count: args.count });
    if let Some(e) = out.error { output::print_err(&e, true, "fake"); }
    println!("{}", out.json);
}
