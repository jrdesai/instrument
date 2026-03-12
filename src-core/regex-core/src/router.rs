use crate::engines::{fancy_engine, rust_engine};
use crate::types::{MatchResult, RegexRequest};

pub fn run(req: &RegexRequest) -> Result<Vec<MatchResult>, String> {
    match req.engine.as_str() {
        "rust" | "go" => rust_engine::run(req),
        "java" | "python" | "pcre" => fancy_engine::run(req),
        "javascript" => Err(
            "JavaScript engine runs in the browser via native RegExp — do not route through Rust."
                .into(),
        ),
        other => Err(format!("Unsupported engine: {}", other)),
    }
}

