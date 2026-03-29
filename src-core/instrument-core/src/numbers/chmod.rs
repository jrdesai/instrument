//! Unix permission calculator: parse octal/symbolic → all representations.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input — the raw permission string (octal "755", symbolic "rwxr-xr-x", etc.)
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ChmodInput {
    pub value: String,
}

/// Human-readable permissions for one class (owner / group / others).
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PermissionClass {
    pub read: bool,
    pub write: bool,
    pub execute: bool,
    pub label: String,
}

/// Full output.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ChmodOutput {
    pub octal: String,
    pub symbolic: String,
    pub decimal: u32,
    pub chmod_command: String,
    pub owner: PermissionClass,
    pub group: PermissionClass,
    pub others: PermissionClass,
    pub setuid: bool,
    pub setgid: bool,
    pub sticky: bool,
    pub error: Option<String>,
}

fn bits_to_class(bits: u32, label_prefix: &str) -> PermissionClass {
    let read = (bits & 0b100) != 0;
    let write = (bits & 0b010) != 0;
    let execute = (bits & 0b001) != 0;

    let mut parts: Vec<&str> = Vec::new();
    if read {
        parts.push("Read");
    }
    if write {
        parts.push("Write");
    }
    if execute {
        parts.push("Execute");
    }
    let label = if parts.is_empty() {
        format!("{label_prefix}: No permissions")
    } else {
        format!("{}: {}", label_prefix, parts.join(", "))
    };

    PermissionClass {
        read,
        write,
        execute,
        label,
    }
}

fn parse_octal(s: &str) -> Option<u32> {
    let s = s.trim_start_matches('0');
    let s = if s.is_empty() { "0" } else { s };
    if s.len() > 4 || !s.chars().all(|c| c.is_ascii_digit() && c <= '7') {
        return None;
    }
    u32::from_str_radix(s, 8).ok()
}

fn parse_symbolic(s: &str) -> Option<u32> {
    let s = if s.len() == 10 { &s[1..] } else { s };
    if s.len() != 9 {
        return None;
    }
    let chars: Vec<char> = s.chars().collect();
    let mut mode: u32 = 0;
    if chars[0] == 'r' {
        mode |= 0o400;
    }
    if chars[1] == 'w' {
        mode |= 0o200;
    }
    if chars[2] == 'x' || chars[2] == 's' {
        mode |= 0o100;
    }
    if chars[2] == 's' {
        mode |= 0o4000;
    }
    if chars[3] == 'r' {
        mode |= 0o040;
    }
    if chars[4] == 'w' {
        mode |= 0o020;
    }
    if chars[5] == 'x' || chars[5] == 's' {
        mode |= 0o010;
    }
    if chars[5] == 's' {
        mode |= 0o2000;
    }
    if chars[6] == 'r' {
        mode |= 0o004;
    }
    if chars[7] == 'w' {
        mode |= 0o002;
    }
    if chars[8] == 'x' || chars[8] == 't' {
        mode |= 0o001;
    }
    if chars[8] == 't' {
        mode |= 0o1000;
    }
    Some(mode)
}

pub fn process(input: ChmodInput) -> ChmodOutput {
    let value = input.value.trim().to_string();

    let error_out = |msg: &str| ChmodOutput {
        octal: String::new(),
        symbolic: String::new(),
        decimal: 0,
        chmod_command: String::new(),
        owner: bits_to_class(0, "Owner"),
        group: bits_to_class(0, "Group"),
        others: bits_to_class(0, "Others"),
        setuid: false,
        setgid: false,
        sticky: false,
        error: Some(msg.to_string()),
    };

    if value.is_empty() {
        return error_out("Enter a permission value");
    }

    let mode = if value
        .chars()
        .any(|c| matches!(c, 'r' | 'w' | 'x' | '-' | 's' | 't'))
    {
        match parse_symbolic(&value) {
            Some(m) => m,
            None => return error_out("Invalid symbolic format. Expected: rwxr-xr-x"),
        }
    } else {
        match parse_octal(&value) {
            Some(m) => m,
            None => return error_out("Invalid octal format. Expected: 755 or 0755"),
        }
    };

    let special = (mode >> 9) & 0b111;
    let setuid = (special & 0b100) != 0;
    let setgid = (special & 0b010) != 0;
    let sticky = (special & 0b001) != 0;

    let owner_bits = (mode >> 6) & 0b111;
    let group_bits = (mode >> 3) & 0b111;
    let others_bits = mode & 0b111;

    let owner_x = if (mode & 0o100) != 0 {
        if setuid {
            's'
        } else {
            'x'
        }
    } else if setuid {
        'S'
    } else {
        '-'
    };
    let group_x = if (mode & 0o010) != 0 {
        if setgid {
            's'
        } else {
            'x'
        }
    } else if setgid {
        'S'
    } else {
        '-'
    };
    let others_x = if (mode & 0o001) != 0 {
        if sticky {
            't'
        } else {
            'x'
        }
    } else if sticky {
        'T'
    } else {
        '-'
    };

    let sym_owner = format!(
        "{}{}{}",
        if (owner_bits & 0b100) != 0 {
            'r'
        } else {
            '-'
        },
        if (owner_bits & 0b010) != 0 {
            'w'
        } else {
            '-'
        },
        owner_x
    );
    let sym_group = format!(
        "{}{}{}",
        if (group_bits & 0b100) != 0 {
            'r'
        } else {
            '-'
        },
        if (group_bits & 0b010) != 0 {
            'w'
        } else {
            '-'
        },
        group_x
    );
    let sym_others = format!(
        "{}{}{}",
        if (others_bits & 0b100) != 0 {
            'r'
        } else {
            '-'
        },
        if (others_bits & 0b010) != 0 {
            'w'
        } else {
            '-'
        },
        others_x
    );

    let symbolic = format!("{sym_owner}{sym_group}{sym_others}");

    let base_octal = mode & 0o777;
    let octal = if special != 0 {
        format!("{:04o}", mode & 0o7777)
    } else {
        format!("{:03o}", base_octal)
    };

    ChmodOutput {
        octal: octal.clone(),
        symbolic,
        decimal: mode,
        chmod_command: format!("chmod {octal} <file>"),
        owner: bits_to_class(owner_bits, "Owner"),
        group: bits_to_class(group_bits, "Group"),
        others: bits_to_class(others_bits, "Others"),
        setuid,
        setgid,
        sticky,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(v: &str) -> ChmodOutput {
        process(ChmodInput {
            value: v.to_string(),
        })
    }

    #[test]
    fn octal_755() {
        let o = run("755");
        assert_eq!(o.octal, "755");
        assert_eq!(o.symbolic, "rwxr-xr-x");
        assert_eq!(o.decimal, 0o755);
        assert!(o.error.is_none());
    }

    #[test]
    fn octal_644() {
        let o = run("644");
        assert_eq!(o.symbolic, "rw-r--r--");
        assert!(o.owner.read && o.owner.write && !o.owner.execute);
        assert!(o.group.read && !o.group.write && !o.group.execute);
    }

    #[test]
    fn octal_with_leading_zero() {
        let o = run("0755");
        assert_eq!(o.octal, "755");
    }

    #[test]
    fn symbolic_rwxrxrx() {
        let o = run("rwxr-xr-x");
        assert_eq!(o.octal, "755");
    }

    #[test]
    fn symbolic_ten_chars() {
        let o = run("-rwxr-xr-x");
        assert_eq!(o.octal, "755");
    }

    #[test]
    fn octal_000() {
        let o = run("000");
        assert_eq!(o.symbolic, "---------");
        assert!(!o.owner.read && !o.owner.write && !o.owner.execute);
    }

    #[test]
    fn octal_777() {
        let o = run("777");
        assert_eq!(o.symbolic, "rwxrwxrwx");
    }

    #[test]
    fn sticky_bit() {
        let o = run("1755");
        assert!(o.sticky);
        assert!(o.symbolic.ends_with('t'));
    }

    #[test]
    fn setuid_bit() {
        let o = run("4755");
        assert!(o.setuid);
    }

    #[test]
    fn invalid_octal() {
        let o = run("999");
        assert!(o.error.is_some());
    }

    #[test]
    fn empty_input() {
        let o = run("");
        assert!(o.error.is_some());
    }

    #[test]
    fn chmod_command_format() {
        let o = run("755");
        assert_eq!(o.chmod_command, "chmod 755 <file>");
    }
}
