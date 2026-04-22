use clap::{Args, ValueEnum};
use instrument_core::csv::{self, CsvOutputFormat};
use instrument_core::html;
use instrument_core::json::config_converter;
use instrument_core::json::converter::{self, ConversionTarget};
use instrument_core::json::diff as json_diff;
use instrument_core::json::{formatter, validator};
use instrument_core::json::path as json_path;
use instrument_core::json::schema_validator;
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

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum JsonTargetArg { Yaml, TypeScript, Csv, Xml }
#[derive(Args)]
pub struct JsonConvertArgs {
    pub text: Option<String>,
    #[arg(short, long)]
    pub file: Option<std::path::PathBuf>,
    #[arg(long, value_enum)]
    pub target: JsonTargetArg,
}
pub fn run_json_convert(args: JsonConvertArgs, json: bool) {
    let value = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "json-convert"));
    let target = match args.target { JsonTargetArg::Yaml => ConversionTarget::Yaml, JsonTargetArg::TypeScript => ConversionTarget::TypeScript, JsonTargetArg::Csv => ConversionTarget::Csv, JsonTargetArg::Xml => ConversionTarget::Xml };
    let out = converter::process(converter::JsonConvertInput { value, target, ts_root_name: None, ts_export: None, ts_optional_fields: None, xml_root_element: None });
    if let Some(e) = out.error { output::print_err(&e, json, "json-convert"); }
    output::print_ok(&out.result, json, "json-convert");
}

#[derive(Args)]
pub struct JsonPathArgs { pub text: Option<String>, #[arg(short, long)] pub file: Option<std::path::PathBuf>, #[arg(long)] pub query: String }
pub fn run_jsonpath(args: JsonPathArgs, json: bool) {
    let value = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "jsonpath"));
    let out = json_path::process(json_path::JsonPathInput { value, query: args.query });
    if let Some(e) = out.error { output::print_err(&e, json, "jsonpath"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"jsonpath", "output": out.matches})); } else { for m in out.matches { println!("{} = {}", m.path, m.value); } }
}

#[derive(Args)]
pub struct JsonDiffArgs { #[arg(long)] pub left: Option<String>, #[arg(long)] pub right: Option<String>, #[arg(long)] pub left_file: Option<std::path::PathBuf>, #[arg(long)] pub right_file: Option<std::path::PathBuf> }
pub fn run_json_diff(args: JsonDiffArgs, json: bool) {
    let left = input::resolve(args.left, args.left_file).unwrap_or_else(|e| output::print_err(&e, json, "json-diff"));
    let right = input::resolve(args.right, args.right_file).unwrap_or_else(|e| output::print_err(&e, json, "json-diff"));
    let out = json_diff::process(json_diff::JsonDiffInput { left, right });
    if let Some(e) = out.error.clone() { output::print_err(&e, json, "json-diff"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"json-diff", "output": out})); } else { println!("added: {}, removed: {}, changed: {}", out.added_count, out.removed_count, out.changed_count); }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum, Default)]
pub enum DraftArg { #[default] Draft7, #[value(name="2019-09")] Draft2019, #[value(name="2020-12")] Draft2020 }
#[derive(Args)]
pub struct JsonSchemaArgs { #[arg(long)] pub document: Option<String>, #[arg(long)] pub schema: Option<String>, #[arg(long)] pub doc_file: Option<std::path::PathBuf>, #[arg(long)] pub schema_file: Option<std::path::PathBuf>, #[arg(long, value_enum, default_value_t = DraftArg::Draft7)] pub draft: DraftArg }
pub fn run_json_schema(args: JsonSchemaArgs, json: bool) {
    let document = input::resolve(args.document, args.doc_file).unwrap_or_else(|e| output::print_err(&e, json, "json-schema"));
    let schema = input::resolve(args.schema, args.schema_file).unwrap_or_else(|e| output::print_err(&e, json, "json-schema"));
    let draft = match args.draft { DraftArg::Draft7 => schema_validator::SchemaDraft::Draft7, DraftArg::Draft2019 => schema_validator::SchemaDraft::Draft2019, DraftArg::Draft2020 => schema_validator::SchemaDraft::Draft2020 };
    let out = schema_validator::process(schema_validator::JsonSchemaValidateInput { document, schema, draft });
    if let Some(e) = out.parse_error.clone() { output::print_err(&e, json, "json-schema"); }
    if json { println!("{}", serde_json::json!({"ok": true, "tool":"json-schema", "output": out})); } else if out.valid { println!("Valid"); } else { println!("Invalid ({} errors)", out.error_count); }
}

#[derive(Copy, Clone, PartialEq, Eq, ValueEnum)]
pub enum ConfigFormatArg { Json, Yaml, Toml }
#[derive(Args)]
pub struct ConfigArgs { pub text: Option<String>, #[arg(short, long)] pub file: Option<std::path::PathBuf>, #[arg(long, value_enum)] pub from: ConfigFormatArg, #[arg(long, value_enum)] pub to: ConfigFormatArg }
pub fn run_config(args: ConfigArgs, json: bool) {
    let value = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "config"));
    let from = match args.from { ConfigFormatArg::Json => config_converter::ConfigFormat::Json, ConfigFormatArg::Yaml => config_converter::ConfigFormat::Yaml, ConfigFormatArg::Toml => config_converter::ConfigFormat::Toml };
    let to = match args.to { ConfigFormatArg::Json => config_converter::ConfigFormat::Json, ConfigFormatArg::Yaml => config_converter::ConfigFormat::Yaml, ConfigFormatArg::Toml => config_converter::ConfigFormat::Toml };
    let out = config_converter::process(config_converter::ConfigConvertInput { value, from, to, indent: 2, sort_keys: false });
    if let Some(e) = out.error { output::print_err(&e, json, "config"); }
    output::print_ok(&out.result, json, "config");
}

#[derive(Args)]
pub struct CsvArgs { pub text: Option<String>, #[arg(short, long)] pub file: Option<std::path::PathBuf>, #[arg(long, default_value = ",")] pub delimiter: String, #[arg(long)] pub no_headers: bool }
pub fn run_csv(args: CsvArgs, json: bool) {
    let value = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "csv"));
    let out = csv::process(csv::CsvToJsonInput { value, has_headers: !args.no_headers, delimiter: args.delimiter, output_format: CsvOutputFormat::ArrayOfObjects });
    if let Some(e) = out.error { output::print_err(&e, json, "csv"); }
    output::print_ok(&out.result, json, "csv");
}

#[derive(Args)]
pub struct HtmlArgs { pub text: Option<String>, #[arg(short, long)] pub file: Option<std::path::PathBuf> }
pub fn run_html(args: HtmlArgs, json: bool) {
    let code = input::resolve(args.text, args.file).unwrap_or_else(|e| output::print_err(&e, json, "html"));
    let out = html::process(html::HtmlFormatInput { code, indent_size: 2, wrap_attributes: false, print_width: 80 });
    if let Some(e) = out.error { output::print_err(&e, json, "html"); }
    output::print_ok(&out.formatted, json, "html");
}
