use std::io::Read;

/// Resolve input text from three sources in priority order:
/// 1. Positional `text` argument (or `-` for explicit stdin)
/// 2. `-f / --file` path
/// 3. Piped stdin (auto-detected when stdin is not a TTY)
pub fn resolve(text: Option<String>, file: Option<std::path::PathBuf>) -> Result<String, String> {
    use std::io::IsTerminal;

    if let Some(t) = text {
        if t == "-" {
            return read_stdin();
        }
        return Ok(t);
    }

    if let Some(path) = file {
        return std::fs::read_to_string(&path)
            .map_err(|e| format!("Cannot read '{}': {e}", path.display()));
    }

    if !std::io::stdin().is_terminal() {
        return read_stdin();
    }

    Err("No input. Pass text as an argument, use -f <file>, or pipe via stdin.".to_string())
}

fn read_stdin() -> Result<String, String> {
    let mut buf = String::new();
    std::io::stdin()
        .read_to_string(&mut buf)
        .map_err(|e| format!("Failed to read stdin: {e}"))?;
    Ok(buf)
}
