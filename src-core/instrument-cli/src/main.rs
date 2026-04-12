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
    /// Hash text (MD5, SHA-1, SHA-256, SHA-512, SHA3-256, SHA3-512); optional HMAC
    Hash(security::HashArgs),
    /// Decode and inspect a JWT token
    Jwt(security::JwtArgs),
    /// Generate UUIDs (v4 or v7)
    Uuid(generators::UuidArgs),
    /// Generate ULIDs
    Ulid(generators::UlidArgs),
    /// Generate Nano IDs
    Nanoid(generators::NanoidArgs),
    /// Generate secure random passwords
    Password(generators::PasswordArgs),
    /// Convert text case (camel, snake, kebab, etc.)
    Case(text::CaseArgs),
    /// Sort, deduplicate, reverse, or trim lines
    Lines(text::LinesArgs),
    /// Count words, characters, and lines
    WordCount(text::WordCountArgs),
    /// Format, minify, or validate JSON
    Json(data::JsonArgs),
    /// Format or validate YAML
    Yaml(data::YamlArgs),
    /// Format XML
    Xml(data::XmlArgs),
    /// Format SQL queries
    Sql(data::SqlArgs),
    /// Convert Unix timestamps and dates
    Timestamp(misc::TimestampArgs),
    /// Parse and bump semantic versions
    Semver(misc::SemverArgs),
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
        Commands::Hash(args) => security::run_hash(args, json),
        Commands::Jwt(args) => security::run_jwt(args, json),
        Commands::Uuid(args) => generators::run_uuid(args, json),
        Commands::Ulid(args) => generators::run_ulid(args, json),
        Commands::Nanoid(args) => generators::run_nanoid(args, json),
        Commands::Password(args) => generators::run_password(args, json),
        Commands::Case(args) => text::run_case(args, json),
        Commands::Lines(args) => text::run_lines(args, json),
        Commands::WordCount(args) => text::run_word_count(args, json),
        Commands::Json(args) => data::run_json(args, json),
        Commands::Yaml(args) => data::run_yaml(args, json),
        Commands::Xml(args) => data::run_xml(args, json),
        Commands::Sql(args) => data::run_sql(args, json),
        Commands::Timestamp(args) => misc::run_timestamp(args, json),
        Commands::Semver(args) => misc::run_semver(args, json),
    }
}
