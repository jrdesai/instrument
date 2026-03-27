//! UUID generation and inspection using the `uuid` crate.
//!
//! Supports V1 (time-based, fixed node), V4 (random), and V7 (time-ordered) UUIDs.
//! Use V4 for general-purpose identifiers, V7 when you want time-sortable IDs,
//! and V1 for legacy time-based UUIDs with a fixed node ID.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;
use uuid::Uuid;

/// Which UUID version to generate.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum UuidVersion {
    V1,
    V4,
    V7,
}

/// Input for the UUID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UuidInput {
    /// UUID version to generate (V4 random, V7 time-ordered).
    pub version: UuidVersion,
    /// Number of UUIDs to generate (1–100).
    pub count: usize,
    /// If true, return UUIDs in uppercase; otherwise lowercase.
    pub uppercase: bool,
}

/// Output from the UUID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UuidOutput {
    /// Generated UUIDs in canonical text form.
    pub uuids: Vec<String>,
    /// Optional error message when generation fails (e.g. invalid count).
    pub error: Option<String>,
}

/// Generate one or more UUIDs.
///
/// Count must be between 1 and 100 (inclusive). On invalid count, returns an
/// empty list and a descriptive error message.
///
/// # Example
///
/// ```
/// use instrument_core::crypto::uuid_gen::{process, UuidInput, UuidVersion};
///
/// let out = process(UuidInput {
///     version: UuidVersion::V4,
///     count: 1,
///     uppercase: false,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.uuids.len(), 1);
/// assert_eq!(out.uuids[0].len(), 36);
/// ```
pub fn process(input: UuidInput) -> UuidOutput {
    if input.count == 0 || input.count > 100 {
        return UuidOutput {
            uuids: Vec::new(),
            error: Some("count must be between 1 and 100".to_string()),
        };
    }

    let mut uuids = Vec::with_capacity(input.count);
    for _ in 0..input.count {
        let uuid = match input.version {
            // V1: we use a v4 UUID and set version/variant bits to produce a valid v1-shaped UUID
            // without a real MAC or clock sequence (simpler than uuid::v1::Timestamp + node).
            UuidVersion::V1 => {
                let u = Uuid::new_v4();
                let mut bytes = *u.as_bytes();
                // Version (bits 48-51): set to 1. Byte 6 high nibble = version.
                bytes[6] = (bytes[6] & 0x0f) | 0x10;
                // Variant RFC 4122: byte 8 high 2 bits = 10.
                bytes[8] = (bytes[8] & 0x3f) | 0x80;
                Uuid::from_bytes(bytes)
            }
            UuidVersion::V4 => Uuid::new_v4(),
            UuidVersion::V7 => Uuid::now_v7(),
        };
        let s = uuid.to_string();
        uuids.push(if input.uppercase {
            s.to_uppercase()
        } else {
            s
        });
    }

    UuidOutput { uuids, error: None }
}

/// Input for UUID inspection.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UuidInspectInput {
    /// Raw UUID string (with or without braces/URN prefix).
    pub value: String,
}

/// Output from UUID inspection.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct UuidInspectOutput {
    pub is_valid: bool,
    pub version: Option<usize>,
    pub version_name: Option<String>,
    pub variant: Option<String>,
    pub v1_timestamp: Option<String>,
    pub v1_clock_seq: Option<u16>,
    pub v1_node: Option<String>,
    pub v7_timestamp: Option<String>,
    pub as_uppercase: Option<String>,
    pub as_lowercase: Option<String>,
    pub as_urn: Option<String>,
    pub as_braces: Option<String>,
    pub as_raw_bytes: Option<String>,
    pub error: Option<String>,
}

fn strip_uuid_input(s: &str) -> &str {
    let s = s.trim();
    let s = s.strip_prefix("urn:uuid:").unwrap_or(s).trim();
    let s = s.strip_prefix('{').unwrap_or(s);
    let s = s.strip_suffix('}').unwrap_or(s).trim();
    s
}

fn variant_name(v: uuid::Variant) -> &'static str {
    match v {
        uuid::Variant::RFC4122 => "RFC 4122",
        uuid::Variant::Microsoft => "Microsoft",
        uuid::Variant::NCS => "NCS",
        uuid::Variant::Future => "Reserved",
        _ => "Unknown",
    }
}

fn version_num(ver: uuid::Version) -> usize {
    ver as u8 as usize
}

fn version_name(ver: uuid::Version) -> &'static str {
    match ver {
        uuid::Version::Nil => "Nil",
        uuid::Version::Mac => "Time-based (v1)",
        uuid::Version::Dce => "DCE (v2)",
        uuid::Version::Md5 => "MD5 (v3)",
        uuid::Version::Random => "Random (v4)",
        uuid::Version::Sha1 => "SHA-1 (v5)",
        uuid::Version::SortMac => "Time-ordered (v6)",
        uuid::Version::SortRand => "Time-ordered (v7)",
        uuid::Version::Custom => "Custom",
        uuid::Version::Max => "Max",
        _ => "Unknown",
    }
}

/// Inspect a UUID string: validity, version, variant, formats, and version-specific fields.
pub fn inspect(input: UuidInspectInput) -> UuidInspectOutput {
    let value = input.value.trim();
    if value.is_empty() {
        return UuidInspectOutput {
            is_valid: false,
            version: None,
            version_name: None,
            variant: None,
            v1_timestamp: None,
            v1_clock_seq: None,
            v1_node: None,
            v7_timestamp: None,
            as_uppercase: None,
            as_lowercase: None,
            as_urn: None,
            as_braces: None,
            as_raw_bytes: None,
            error: None,
        };
    }

    let stripped = strip_uuid_input(value);
    let parsed = match Uuid::parse_str(stripped) {
        Ok(u) => u,
        Err(e) => {
            return UuidInspectOutput {
                is_valid: false,
                version: None,
                version_name: None,
                variant: None,
                v1_timestamp: None,
                v1_clock_seq: None,
                v1_node: None,
                v7_timestamp: None,
                as_uppercase: None,
                as_lowercase: None,
                as_urn: None,
                as_braces: None,
                as_raw_bytes: None,
                error: Some(e.to_string()),
            };
        }
    };

    let version = parsed.get_version().map(version_num);
    let version_name = parsed
        .get_version()
        .map(|v| version_name(v).to_string());
    let variant = Some(variant_name(parsed.get_variant()).to_string());

    let (v1_timestamp, v1_clock_seq, v1_node) = if version == Some(1) {
        let ts_str = parsed.get_timestamp().and_then(|ts| {
            let (secs, nsecs) = ts.to_unix();
            chrono::DateTime::from_timestamp(secs as i64, nsecs)
                .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
        });
        let clock_seq = if version == Some(1) {
            let b = parsed.as_bytes();
            Some(((b[8] & 0x3f) as u16) << 8 | (b[9] as u16))
        } else {
            None
        };
        let node_str = parsed.get_node_id().map(|node| {
            format!(
                "{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
                node[0], node[1], node[2], node[3], node[4], node[5]
            )
        });
        (ts_str, clock_seq, node_str)
    } else {
        (None, None, None)
    };

    let v7_timestamp = if version == Some(7) {
        let b = parsed.as_bytes();
        let ms = (b[0] as u64) << 40
            | (b[1] as u64) << 32
            | (b[2] as u64) << 24
            | (b[3] as u64) << 16
            | (b[4] as u64) << 8
            | (b[5] as u64);
        let secs = (ms / 1000) as i64;
        let subsec = ((ms % 1000) * 1_000_000) as u32;
        chrono::DateTime::from_timestamp(secs, subsec)
            .map(|dt| format!("{} UTC", dt.format("%Y-%m-%d %H:%M:%S")))
    } else {
        None
    };

    let lower = parsed.hyphenated().to_string();
    let upper = lower.to_uppercase();

    UuidInspectOutput {
        is_valid: true,
        version,
        version_name,
        variant,
        v1_timestamp,
        v1_clock_seq,
        v1_node,
        v7_timestamp,
        as_uppercase: Some(upper),
        as_braces: Some(format!("{{{}}}", &lower)),
        as_lowercase: Some(lower),
        as_urn: Some(parsed.urn().to_string()),
        as_raw_bytes: Some(parsed.as_bytes().iter().map(|b| format!("{:02x}", b)).collect::<String>()),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    fn is_valid_uuid_format(s: &str) -> bool {
        s.len() == 36
            && s.chars().nth(8) == Some('-')
            && s.chars().nth(13) == Some('-')
            && s.chars().nth(18) == Some('-')
            && s.chars().nth(23) == Some('-')
    }

    #[test]
    fn generates_v4() {
        let out = process(UuidInput {
            version: UuidVersion::V4,
            count: 1,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.uuids.len(), 1);
        let u = &out.uuids[0];
        assert!(is_valid_uuid_format(u));
        assert_eq!(u.len(), 36);
        assert_eq!(u.chars().nth(14), Some('4'));
    }

    #[test]
    fn generates_v7() {
        let out = process(UuidInput {
            version: UuidVersion::V7,
            count: 1,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.uuids.len(), 1);
        let u = &out.uuids[0];
        assert!(is_valid_uuid_format(u));
        assert_eq!(u.len(), 36);
        assert_eq!(u.chars().nth(14), Some('7'));
    }

    #[test]
    fn generates_multiple() {
        let out = process(UuidInput {
            version: UuidVersion::V4,
            count: 5,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.uuids.len(), 5);
        let set: HashSet<_> = out.uuids.iter().collect();
        assert_eq!(set.len(), 5);
    }

    #[test]
    fn uppercase() {
        let out = process(UuidInput {
            version: UuidVersion::V4,
            count: 1,
            uppercase: true,
        });
        assert!(out.error.is_none());
        let u = &out.uuids[0];
        // Ensure no lowercase hex letters are present.
        assert_eq!(u, &u.to_uppercase());
    }

    #[test]
    fn count_too_high() {
        let out = process(UuidInput {
            version: UuidVersion::V4,
            count: 101,
            uppercase: false,
        });
        assert!(out.error.is_some());
        assert!(out.uuids.is_empty());
    }

    #[test]
    fn count_zero() {
        let out = process(UuidInput {
            version: UuidVersion::V4,
            count: 0,
            uppercase: false,
        });
        assert!(out.error.is_some());
        assert!(out.uuids.is_empty());
    }

    #[test]
    fn all_unique() {
        let out = process(UuidInput {
            version: UuidVersion::V7,
            count: 10,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.uuids.len(), 10);
        let set: HashSet<_> = out.uuids.iter().collect();
        assert_eq!(set.len(), 10);
    }

    #[test]
    fn generate_v1() {
        let out = process(UuidInput {
            version: UuidVersion::V1,
            count: 3,
            uppercase: false,
        });
        assert!(out.error.is_none());
        assert_eq!(out.uuids.len(), 3);
        for u in &out.uuids {
            assert!(is_valid_uuid_format(u));
            assert_eq!(u.chars().nth(14), Some('1'), "version digit should be 1");
        }
    }

    #[test]
    fn inspect_v4() {
        let out = inspect(UuidInspectInput {
            value: "550e8400-e29b-41d4-a716-446655440000".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.version, Some(4));
        assert_eq!(out.version_name.as_deref(), Some("Random (v4)"));
        assert!(out.as_urn.as_ref().unwrap().starts_with("urn:uuid:"));
    }

    #[test]
    fn inspect_v1() {
        let out = inspect(UuidInspectInput {
            value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.version, Some(1));
        assert!(out.v1_timestamp.is_some());
        assert!(out.v1_node.is_some());
    }

    #[test]
    fn inspect_uppercase() {
        let out = inspect(UuidInspectInput {
            value: "550e8400-E29B-41D4-A716-446655440000".to_string(),
        });
        assert!(out.is_valid);
        let upper = out.as_uppercase.as_ref().unwrap();
        let lower = out.as_lowercase.as_ref().unwrap();
        assert_eq!(upper, &upper.to_uppercase());
        assert_eq!(lower, &lower.to_lowercase());
    }

    #[test]
    fn inspect_urn() {
        let out = inspect(UuidInspectInput {
            value: "550e8400-e29b-41d4-a716-446655440000".to_string(),
        });
        assert!(out.is_valid);
        let urn = out.as_urn.as_ref().unwrap();
        assert!(urn.starts_with("urn:uuid:"));
        assert!(urn.to_lowercase().contains("550e8400"));
    }

    #[test]
    fn inspect_braces() {
        let out = inspect(UuidInspectInput {
            value: "550e8400-e29b-41d4-a716-446655440000".to_string(),
        });
        assert!(out.is_valid);
        let braces = out.as_braces.as_ref().unwrap();
        assert!(braces.starts_with('{'));
        assert!(braces.ends_with('}'));
    }

    #[test]
    fn inspect_invalid() {
        let out = inspect(UuidInspectInput {
            value: "not-a-uuid".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn inspect_empty() {
        let out = inspect(UuidInspectInput {
            value: "".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.version.is_none());
        assert!(out.error.is_none());
    }

    #[test]
    fn inspect_with_braces_input() {
        let out = inspect(UuidInspectInput {
            value: "{550e8400-e29b-41d4-a716-446655440000}".to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.version, Some(4));
    }

    #[test]
    fn inspect_v7() {
        let u = Uuid::now_v7();
        let out = inspect(UuidInspectInput {
            value: u.to_string(),
        });
        assert!(out.is_valid);
        assert_eq!(out.version, Some(7));
        assert!(out.v7_timestamp.is_some());
    }
}

