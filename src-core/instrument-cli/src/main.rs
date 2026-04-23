mod commands;
mod input;
mod output;

use clap::{Parser, Subcommand};
use commands::*;

#[derive(Parser)]
#[command(
    name = "instrument",
    version,
    about = "A privacy-first developer toolkit for the command line.",
    long_about = None,
    arg_required_else_help = true,
)]
struct Cli {
    /// Emit machine-readable JSON on stdout (errors on stderr)
    #[arg(long, global = true)]
    json: bool,
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Encode or decode Base64
    Base64(encoding::Base64Args),
    /// Encode or decode URL percent-encoding
    Url(encoding::UrlArgs),
    /// Encode or decode hexadecimal
    Hex(encoding::HexArgs),
    /// Encode or decode HTML entities
    HtmlEntity(encoding::HtmlEntityArgs),
    /// Convert text to a URL-safe slug
    Slug(encoding::SlugArgs),
    /// Encode/decode Morse code
    Morse(encoding::MorseArgs),
    /// Look up a character by codepoint, decimal, hex, abbreviation, or name
    Char(encoding::CharArgs),
    /// Hash text (MD5, SHA-1, SHA-256, SHA-512, SHA3-256, SHA3-512); optional HMAC
    Hash(security::HashArgs),
    /// Decode and inspect a JWT token
    Jwt(security::JwtArgs),
    /// Bcrypt hash/verify
    Bcrypt(security::BcryptArgs),
    /// Decode X509 certificates
    Cert(security::CertArgs),
    /// Generate UUIDs (v4 or v7)
    Uuid(generators::UuidArgs),
    /// Generate ULIDs
    Ulid(generators::UlidArgs),
    /// Generate Nano IDs
    Nanoid(generators::NanoidArgs),
    /// Generate secure random passwords
    Password(generators::PasswordArgs),
    /// Generate API keys
    ApiKey(generators::ApiKeyArgs),
    /// Generate passphrases
    Passphrase(generators::PassphraseArgs),
    /// Convert text case (camel, snake, kebab, etc.)
    Case(text::CaseArgs),
    /// Sort, deduplicate, reverse, or trim lines
    Lines(text::LinesArgs),
    /// Count words, characters, and lines
    WordCount(text::WordCountArgs),
    /// Escape/unescape strings
    Escape(text::EscapeArgs),
    /// NATO phonetic encoder/decoder
    Nato(text::NatoArgs),
    /// Find and replace text
    Replace(text::ReplaceArgs),
    /// Text diff
    Diff(text::DiffArgs),
    /// Lorem ipsum generator
    Lorem(text::LoremArgs),
    /// Unicode inspector
    Unicode(text::UnicodeArgs),
    /// Env/config parser
    Env(text::EnvArgs),
    /// Fake data generator
    Fake(text::FakeArgs),
    /// Format, minify, or validate JSON
    Json(data::JsonArgs),
    /// Format or validate YAML
    Yaml(data::YamlArgs),
    /// Format XML
    Xml(data::XmlArgs),
    /// Format SQL queries
    Sql(data::SqlArgs),
    /// JSON convert
    JsonConvert(data::JsonConvertArgs),
    /// JSONPath query
    Jsonpath(data::JsonPathArgs),
    /// JSON diff
    JsonDiff(data::JsonDiffArgs),
    /// JSON schema validate
    JsonSchema(data::JsonSchemaArgs),
    /// Config converter
    Config(data::ConfigArgs),
    /// CSV to JSON
    Csv(data::CsvArgs),
    /// HTML formatter
    Html(data::HtmlArgs),
    /// Convert Unix timestamps and dates
    Timestamp(misc::TimestampArgs),
    /// Parse and bump semantic versions
    Semver(misc::SemverArgs),
    /// Date calculator operations
    Date(misc::DateArgs),
    /// Percentage calculator
    Percent(misc::PercentArgs),
    /// Roman numeral conversions
    Roman(misc::RomanArgs),
    /// MIME type lookup
    Mime(misc::MimeArgs),
    /// HTTP status lookup
    HttpStatus(misc::HttpStatusArgs),
    /// MAC address parser/generator
    Mac(misc::MacArgs),
    /// Build curl commands
    CurlBuild(misc::CurlBuildArgs),
    /// Chmod calculator
    Chmod(misc::ChmodArgs),
    /// Timezone converter
    Timezone(misc::TimezoneArgs),
    /// ISO8601 parser/formatter
    Iso8601(misc::Iso8601Args),
    /// Cron parser
    Cron(misc::CronArgs),
    /// Number base converter
    Base(misc::BaseArgs),
    /// Unit converter
    Unit(misc::UnitArgs),
    /// Bitwise calculator
    Bitwise(misc::BitwiseArgs),
    /// Expression evaluator
    Eval(misc::EvalArgs),
    /// Color contrast checker
    Contrast(misc::ContrastArgs),
    /// URL parser
    UrlParse(misc::UrlParseArgs),
    /// User agent parser
    UserAgent(misc::UserAgentArgs),
    /// CIDR calculator
    Cidr(misc::CidrArgs),
    /// Color converter
    Color(misc::ColorArgs),
    /// QR code generator
    Qr(misc::QrArgs),
}

fn main() {
    let cli = Cli::parse();
    let json = cli.json;
    match cli.command {
        Commands::Base64(args) => encoding::run_base64(args, json),
        Commands::Url(args) => encoding::run_url(args, json),
        Commands::Hex(args) => encoding::run_hex(args, json),
        Commands::HtmlEntity(args) => encoding::run_html_entity(args, json),
        Commands::Slug(args) => encoding::run_slug(args, json),
        Commands::Morse(args) => encoding::run_morse(args, json),
        Commands::Char(args) => encoding::run_char(args, json),
        Commands::Hash(args) => security::run_hash(args, json),
        Commands::Jwt(args) => security::run_jwt(args, json),
        Commands::Bcrypt(args) => security::run_bcrypt(args, json),
        Commands::Cert(args) => security::run_cert(args, json),
        Commands::Uuid(args) => generators::run_uuid(args, json),
        Commands::Ulid(args) => generators::run_ulid(args, json),
        Commands::Nanoid(args) => generators::run_nanoid(args, json),
        Commands::Password(args) => generators::run_password(args, json),
        Commands::ApiKey(args) => generators::run_api_key(args, json),
        Commands::Passphrase(args) => generators::run_passphrase(args, json),
        Commands::Case(args) => text::run_case(args, json),
        Commands::Lines(args) => text::run_lines(args, json),
        Commands::WordCount(args) => text::run_word_count(args, json),
        Commands::Escape(args) => text::run_escape(args, json),
        Commands::Nato(args) => text::run_nato(args, json),
        Commands::Replace(args) => text::run_replace(args, json),
        Commands::Diff(args) => text::run_diff(args, json),
        Commands::Lorem(args) => text::run_lorem(args, json),
        Commands::Unicode(args) => text::run_unicode(args, json),
        Commands::Env(args) => text::run_env(args, json),
        Commands::Fake(args) => text::run_fake(args, json),
        Commands::Json(args) => data::run_json(args, json),
        Commands::Yaml(args) => data::run_yaml(args, json),
        Commands::Xml(args) => data::run_xml(args, json),
        Commands::Sql(args) => data::run_sql(args, json),
        Commands::JsonConvert(args) => data::run_json_convert(args, json),
        Commands::Jsonpath(args) => data::run_jsonpath(args, json),
        Commands::JsonDiff(args) => data::run_json_diff(args, json),
        Commands::JsonSchema(args) => data::run_json_schema(args, json),
        Commands::Config(args) => data::run_config(args, json),
        Commands::Csv(args) => data::run_csv(args, json),
        Commands::Html(args) => data::run_html(args, json),
        Commands::Timestamp(args) => misc::run_timestamp(args, json),
        Commands::Semver(args) => misc::run_semver(args, json),
        Commands::Date(args) => misc::run_date(args, json),
        Commands::Percent(args) => misc::run_percent(args, json),
        Commands::Roman(args) => misc::run_roman(args, json),
        Commands::Mime(args) => misc::run_mime(args, json),
        Commands::HttpStatus(args) => misc::run_http_status(args, json),
        Commands::Mac(args) => misc::run_mac(args, json),
        Commands::CurlBuild(args) => misc::run_curl_build(args, json),
        Commands::Chmod(args) => misc::run_chmod(args, json),
        Commands::Timezone(args) => misc::run_timezone(args, json),
        Commands::Iso8601(args) => misc::run_iso8601(args, json),
        Commands::Cron(args) => misc::run_cron(args, json),
        Commands::Base(args) => misc::run_base(args, json),
        Commands::Unit(args) => misc::run_unit(args, json),
        Commands::Bitwise(args) => misc::run_bitwise(args, json),
        Commands::Eval(args) => misc::run_eval(args, json),
        Commands::Contrast(args) => misc::run_contrast(args, json),
        Commands::UrlParse(args) => misc::run_url_parse(args, json),
        Commands::UserAgent(args) => misc::run_user_agent(args, json),
        Commands::Cidr(args) => misc::run_cidr(args, json),
        Commands::Color(args) => misc::run_color(args, json),
        Commands::Qr(args) => misc::run_qr(args, json),
    }
}
