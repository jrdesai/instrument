use std::process::Command;

fn instrument() -> Command {
    Command::new(env!("CARGO_BIN_EXE_instrument"))
}

#[test]
fn base64_encode() {
    let out = instrument()
        .args(["base64", "encode", "hello"])
        .output()
        .expect("run instrument");
    assert!(out.status.success());
    assert_eq!(String::from_utf8_lossy(&out.stdout).trim(), "aGVsbG8=");
}

#[test]
fn base64_decode() {
    let out = instrument()
        .args(["base64", "decode", "aGVsbG8="])
        .output()
        .expect("run instrument");
    assert!(out.status.success());
    assert_eq!(String::from_utf8_lossy(&out.stdout).trim(), "hello");
}

#[test]
fn uuid_generates_valid_format() {
    let out = instrument().args(["uuid"]).output().expect("run instrument");
    assert!(out.status.success());
    let id = String::from_utf8_lossy(&out.stdout);
    assert_eq!(id.trim().len(), 36);
}

#[test]
fn hash_sha256() {
    let out = instrument()
        .args(["hash", "sha256", "hello"])
        .output()
        .expect("run instrument");
    assert!(out.status.success());
    assert!(
        String::from_utf8_lossy(&out.stdout)
            .trim()
            .starts_with("2cf24dba")
    );
}

#[test]
fn json_format_valid() {
    let out = instrument()
        .args(["json", "format", r#"{"b":1,"a":2}"#])
        .output()
        .expect("run instrument");
    assert!(out.status.success());
}

#[test]
fn json_flag_output() {
    let out = instrument()
        .args(["--json", "base64", "encode", "hi"])
        .output()
        .expect("run instrument");
    let parsed: serde_json::Value = serde_json::from_slice(&out.stdout).expect("json stdout");
    assert_eq!(parsed["ok"], true);
    assert!(parsed["output"].as_str().is_some());
}

#[test]
fn error_exits_nonzero() {
    let out = instrument()
        .args(["base64", "decode", "not-valid!!!"])
        .output()
        .expect("run instrument");
    assert!(!out.status.success());
}
