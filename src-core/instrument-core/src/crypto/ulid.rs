//! ULID generation using the `ulid` crate.
//!
//! ULIDs are 26-character, Crockford Base32 identifiers that are
//! time-sortable, URL-safe, and monotonically increasing within the same
//! millisecond when generated sequentially.

use serde::{Deserialize, Serialize};
use ulid::{Generator, Ulid};

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
}

