//! UUID generation using the `uuid` crate.
//!
//! Supports V4 (random) and V7 (time-ordered) UUIDs. Use V4 for general-purpose
//! identifiers, and V7 when you want time-sortable IDs (e.g. database keys).

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Which UUID version to generate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UuidVersion {
    V4,
    V7,
}

/// Input for the UUID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UuidInput {
    /// UUID version to generate (V4 random, V7 time-ordered).
    pub version: UuidVersion,
    /// Number of UUIDs to generate (1–100).
    pub count: usize,
    /// If true, return UUIDs in uppercase; otherwise lowercase.
    pub uppercase: bool,
}

/// Output from the UUID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
}

