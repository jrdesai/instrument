/// Print a successful result to stdout.
/// When `json_mode` is set, wrap in `{"ok": true, "output": ...}`.
/// Otherwise print the raw string value directly (no trailing newline added if already present).
pub fn print_ok(value: &str, json_mode: bool, tool: &str) {
    if json_mode {
        let obj = serde_json::json!({ "ok": true, "tool": tool, "output": value });
        println!("{}", obj);
    } else if value.ends_with('\n') {
        print!("{value}");
    } else {
        println!("{value}");
    }
}

/// Print an error to stderr and exit with code 1.
pub fn print_err(msg: &str, json_mode: bool, tool: &str) -> ! {
    if json_mode {
        let obj = serde_json::json!({ "ok": false, "tool": tool, "error": msg });
        eprintln!("{}", obj);
    } else {
        eprintln!("error: {msg}");
    }
    std::process::exit(1);
}
