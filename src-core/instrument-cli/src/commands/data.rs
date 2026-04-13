use clap::{Args, ValueEnum};
use instrument_core::json::{formatter, validator};
use instrument_core::sql::{self as sql_fmt};
use instrument_core::xml;
use instrument_core::yaml_fmt;

use crate::{input, output};

// ── JSON ──────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum JsonAction {
    Format,
    Minify,
    Validate,
}

#[derive(Args)]
pub struct JsonArgs {
    #[arg(value_enum, default_value_t = JsonAction::Format)]
    pub action: JsonAction,
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    /// Indent style: 2 (default), 4, tab
    #[arg(long, default_value = "2", value_parser = ["2", "4", "tab"])]
    pub indent: String,
}

pub fn run_json(args: JsonArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "json"));
    match args.action {
        JsonAction::Format | JsonAction::Minify => {
            let minify = matches!(args.action, JsonAction::Minify);
            let mode = if minify {
                formatter::JsonFormatMode::Minify
            } else {
                formatter::JsonFormatMode::Pretty
            };
            let indent = match args.indent.as_str() {
                "4" => formatter::IndentStyle::Spaces4,
                "tab" => formatter::IndentStyle::Tab,
                _ => formatter::IndentStyle::Spaces2,
            };
            let result = formatter::process(formatter::JsonFormatInput {
                value: inp,
                mode,
                indent,
                sort_keys: false,
            });
            match result.error {
                Some(e) => output::print_err(&e, json, "json"),
                None => output::print_ok(&result.result, json, "json"),
            }
        }
        JsonAction::Validate => {
            let result = validator::process(validator::JsonValidateInput { value: inp });
            if json {
                println!(
                    "{}",
                    serde_json::json!({
                        "ok": result.is_valid, "tool": "json",
                        "valid": result.is_valid, "error": result.error,
                    })
                );
            } else if result.is_valid {
                println!("Valid JSON");
            } else {
                output::print_err(
                    &result.error.unwrap_or_else(|| "Invalid JSON".to_string()),
                    json,
                    "json",
                );
            }
        }
    }
}

// ── YAML ──────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum YamlAction {
    Format,
    Validate,
}

#[derive(Args)]
pub struct YamlArgs {
    #[arg(value_enum, default_value_t = YamlAction::Format)]
    pub action: YamlAction,
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_yaml(args: YamlArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "yaml"));
    let result = yaml_fmt::process(yaml_fmt::YamlFormatInput { value: inp });
    match args.action {
        YamlAction::Format => match result.error {
            Some(e) => output::print_err(&e, json, "yaml"),
            None => output::print_ok(&result.result, json, "yaml"),
        },
        YamlAction::Validate => {
            if json {
                let ok = result.error.is_none();
                println!(
                    "{}",
                    serde_json::json!({ "ok": ok, "tool": "yaml", "valid": ok, "error": result.error })
                );
            } else if result.error.is_none() {
                println!("Valid YAML");
            } else {
                output::print_err(
                    &result.error.unwrap_or_else(|| "Invalid YAML".to_string()),
                    json,
                    "yaml",
                );
            }
        }
    }
}

// ── XML ───────────────────────────────────────────────────────────────────────

#[derive(Args)]
pub struct XmlArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
}

pub fn run_xml(args: XmlArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "xml"));
    let result = xml::process(xml::XmlFormatInput {
        value: inp,
        indent_size: 2,
    });
    match result.error {
        Some(e) => output::print_err(&e, json, "xml"),
        None => output::print_ok(&result.result, json, "xml"),
    }
}

// ── SQL ───────────────────────────────────────────────────────────────────────

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum SqlKeywordArg {
    Upper,
    Lower,
    Preserve,
}

#[derive(Args)]
pub struct SqlArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, value_enum, default_value_t = SqlKeywordArg::Upper)]
    pub keywords: SqlKeywordArg,
}

pub fn run_sql(args: SqlArgs, json: bool) {
    let inp = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "sql"));
    let keyword_case = match args.keywords {
        SqlKeywordArg::Upper => sql_fmt::SqlKeywordCase::Upper,
        SqlKeywordArg::Lower => sql_fmt::SqlKeywordCase::Lower,
        SqlKeywordArg::Preserve => sql_fmt::SqlKeywordCase::Preserve,
    };
    let result = sql_fmt::process(sql_fmt::SqlFormatInput {
        value: inp,
        indent: sql_fmt::SqlIndentStyle::Spaces2,
        keyword_case,
    });
    match result.error {
        Some(e) => output::print_err(&e, json, "sql"),
        None => output::print_ok(&result.result, json, "sql"),
    }
}
