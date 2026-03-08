//! ULID generation and inspection using the `ulid` crate.
//!
//! ULIDs are 26-character, Crockford Base32 identifiers that are
//! time-sortable, URL-safe, and monotonically increasing within the same
//! millisecond when generated sequentially.

use serde::{Deserialize, Serialize};
use ulid::{Generator, Ulid};

/// Input for ULID inspection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UlidInspectInput {
    /// Raw ULID string (26 chars, Crockford Base32).
    pub value: String,
}

/// Output from ULID inspection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UlidInspectOutput {
    pub is_valid: bool,
    pub timestamp_ms: Option<i64>,
    pub timestamp_human: Option<String>,
    pub timestamp_iso: Option<String>,
    pub randomness: Option<String>,
    pub as_uppercase: Option<String>,
    pub as_lowercase: Option<String>,
    pub error: Option<String>,
}

/// Input for the ULID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UlidInput {
    /// Number of ULIDs to generate (1–100).
    pub count: usize,
    /// If true, return ULIDs in uppercase (default ULID form); otherwise lowercase.
    pub uppercase: bool,
}

/// Output from the ULID Generator tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UlidOutput {
    /// Generated ULIDs as 26-character Base32 strings.
    pub ulids: Vec<String>,
    /// Optional error message when generation fails (e.g. invalid count).
    pub error: Option<String>,
}

/// Generate one or more ULIDs.
///
/// Count must be between 1 and 100 (inclusive). On invalid count, returns an
/// empty list and a descriptive error message.
///
/// # Example
///
/// ```
/// use instrument_core::crypto::ulid::{process, UlidInput};
///
/// let out = process(UlidInput {
///     count: 1,
///     uppercase: true,
/// });
/// assert!(out.error.is_none());
/// assert_eq!(out.ulids.len(), 1);
/// assert_eq!(out.ulids[0].len(), 26);
/// ```
pub fn process(input: UlidInput) -> UlidOutput {
    if input.count == 0 || input.count > 100 {
        return UlidOutput {
            ulids: Vec::new(),
            error: Some("count must be between 1 and 100".to_string()),
        };
    }

    let mut ulids = Vec::with_capacity(input.count);
    let mut gen = Generator::new();
    for _ in 0..input.count {
        let ulid = gen.generate().unwrap_or_else(|_| Ulid::new());
        let s = ulid.to_string(); // crate returns uppercase by default
        ulids.push(if input.uppercase {
            s
        } else {
            s.to_lowercase()
        });
    }

    UlidOutput { ulids, error: None }
}

/// Inspect a ULID string: validity, timestamp, randomness, and format variants.
///
/// ULID is 26 characters, Crockford Base32 (0-9, A-Z excluding I, L, O, U).
/// Case-insensitive parsing. First 10 chars = 48-bit timestamp (ms); last 16 = 80-bit random.
pub fn inspect(input: UlidInspectInput) -> UlidInspectOutput {
    let trimmed = input.value.trim();
    if trimmed.is_empty() {
        return UlidInspectOutput {
            is_valid: false,
            timestamp_ms: None,
            timestamp_human: None,
            timestamp_iso: None,
            randomness: None,
            as_uppercase: None,
            as_lowercase: None,
            error: None,
        };
    }

    let parsed = Ulid::from_string(trimmed);
    let ulid = match parsed {
        Ok(u) => u,
        Err(e) => {
            return UlidInspectOutput {
                is_valid: false,
                timestamp_ms: None,
                timestamp_human: None,
                timestamp_iso: None,
                randomness: None,
                as_uppercase: None,
                as_lowercase: None,
                error: Some(e.to_string()),
            };
        }
    };

    let ts_ms = ulid.timestamp_ms() as i64;
    let secs = ts_ms / 1000;
    let nsecs = ((ts_ms % 1000) * 1_000_000) as u32;
    let dt = chrono::DateTime::from_timestamp(secs, nsecs);
    let timestamp_human = dt.map(|d| {
        format!(
            "{}.{:03} UTC",
            d.format("%Y-%m-%d %H:%M:%S"),
            d.timestamp_subsec_millis()
        )
    });
    let timestamp_iso = dt.map(|d| {
        format!(
            "{}.{:03}Z",
            d.format("%Y-%m-%dT%H:%M:%S"),
            d.timestamp_subsec_millis()
        )
    });

    let s = ulid.to_string();
    let randomness = s.get(10..26).map(|r| r.to_string());

    UlidInspectOutput {
        is_valid: true,
        timestamp_ms: Some(ts_ms),
        timestamp_human,
        timestamp_iso,
        randomness,
        as_uppercase: Some(s.clone()),
        as_lowercase: Some(s.to_lowercase()),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn generates_one() {
        let out = process(UlidInput {
            count: 1,
            uppercase: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.ulids.len(), 1);
        let u = &out.ulids[0];
        assert_eq!(u.len(), 26);
    }

    #[test]
    fn generates_multiple() {
        let out = process(UlidInput {
            count: 5,
            uppercase: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.ulids.len(), 5);
    }

    #[test]
    fn all_unique() {
        let out = process(UlidInput {
            count: 10,
            uppercase: true,
        });
        assert!(out.error.is_none());
        assert_eq!(out.ulids.len(), 10);
        let set: HashSet<_> = out.ulids.iter().collect();
        assert_eq!(set.len(), 10);
    }

    #[test]
    fn uppercase() {
        let out = process(UlidInput {
            count: 1,
            uppercase: true,
        });
        assert!(out.error.is_none());
        let u = &out.ulids[0];
        // Ensure string is all uppercase.
        assert_eq!(u, &u.to_uppercase());
    }

    #[test]
    fn lowercase() {
        let out = process(UlidInput {
            count: 1,
            uppercase: false,
        });
        assert!(out.error.is_none());
        let u = &out.ulids[0];
        assert_eq!(u, &u.to_lowercase());
    }

    #[test]
    fn time_ordered() {
        let out = process(UlidInput {
            count: 5,
            uppercase: true,
        });
        assert!(out.error.is_none());
        let ulids = out.ulids;
        assert_eq!(ulids.len(), 5);
        for pair in ulids.windows(2) {
            assert!(pair[0] <= pair[1], "ULIDs are not time-ordered");
        }
    }

    #[test]
    fn count_too_high() {
        let out = process(UlidInput {
            count: 101,
            uppercase: true,
        });
        assert!(out.error.is_some());
        assert!(out.ulids.is_empty());
    }

    #[test]
    fn count_zero() {
        let out = process(UlidInput {
            count: 0,
            uppercase: true,
        });
        assert!(out.error.is_some());
        assert!(out.ulids.is_empty());
    }

    #[test]
    fn inspect_valid() {
        let ulid_str = Ulid::new().to_string();
        let out = inspect(UlidInspectInput {
            value: ulid_str.clone(),
        });
        assert!(out.is_valid);
        assert!(out.timestamp_ms.is_some());
        assert_eq!(out.randomness.as_ref().map(|s| s.len()), Some(16));
        let upper = out.as_uppercase.as_ref().unwrap();
        let lower = out.as_lowercase.as_ref().unwrap();
        assert_eq!(upper, &upper.to_uppercase());
        assert_eq!(lower, &lower.to_lowercase());
    }

    #[test]
    fn inspect_timestamp() {
        let out = inspect(UlidInspectInput {
            value: "01ARZ3NDEKTSV4RRFFQ69G5FAV".to_string(),
        });
        assert!(out.is_valid);
        let ms = out.timestamp_ms.expect("timestamp_ms");
        assert!(ms > 0);
        let human = out.timestamp_human.as_ref().unwrap();
        assert!(human.contains('-') && human.contains("UTC"));
    }

    #[test]
    fn inspect_invalid_chars() {
        // I and O are invalid in Crockford Base32
        let out = inspect(UlidInspectInput {
            value: "01ARZ3NDEKTSV4RRFFQ69G5FAI".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.error.is_some());
    }

    #[test]
    fn inspect_wrong_length() {
        let out25 = inspect(UlidInspectInput {
            value: "01ARZ3NDEKTSV4RRFFQ69G5FA".to_string(),
        });
        assert!(!out25.is_valid);
        assert!(out25.error.is_some());

        let out27 = inspect(UlidInspectInput {
            value: "01ARZ3NDEKTSV4RRFFQ69G5FAVV".to_string(),
        });
        assert!(!out27.is_valid);
        assert!(out27.error.is_some());
    }

    #[test]
    fn inspect_empty() {
        let out = inspect(UlidInspectInput {
            value: "".to_string(),
        });
        assert!(!out.is_valid);
        assert!(out.timestamp_ms.is_none());
        assert!(out.error.is_none());
    }

    #[test]
    fn inspect_lowercase_input() {
        let out = inspect(UlidInspectInput {
            value: "01arz3ndektsv4rrffq69g5fav".to_string(),
        });
        assert!(out.is_valid);
        assert!(out.timestamp_ms.is_some());
    }
}

