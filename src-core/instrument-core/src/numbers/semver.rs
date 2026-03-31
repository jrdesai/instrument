//! Semantic version parsing, comparison, range checks, and bump helpers.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::cmp::Ordering;
use semver::{BuildMetadata, Prerelease, Version, VersionReq};
use ts_rs::TS;

/// Input for the Semver tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SemverInput {
    /// Version string (optional leading `v` is stripped).
    pub version: String,
    /// Optional second version to compare (`Ordering` in `compare_result`).
    pub compare_with: Option<String>,
    /// Optional requirement string (e.g. `^1.0.0`, `>=1.2.3 <2.0.0`).
    pub range: Option<String>,
}

/// How the primary version relates to `compare_with`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum SemverCompareResult {
    LessThan,
    Equal,
    GreaterThan,
}

/// Output from Semver processing.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SemverOutput {
    pub major: Option<u64>,
    pub minor: Option<u64>,
    pub patch: Option<u64>,
    pub prerelease: String,
    pub build_metadata: String,
    /// Normalized semver string for the parsed version.
    pub canonical: String,
    pub compare_result: Option<SemverCompareResult>,
    pub compare_error: Option<String>,
    pub range_satisfied: Option<bool>,
    pub range_error: Option<String>,
    pub bumped_major: Option<String>,
    pub bumped_minor: Option<String>,
    pub bumped_patch: Option<String>,
    pub error: Option<String>,
}

fn normalize_version_str(raw: &str) -> &str {
    raw.trim().strip_prefix('v').unwrap_or(raw).trim()
}

fn empty_result() -> SemverOutput {
    SemverOutput {
        major: None,
        minor: None,
        patch: None,
        prerelease: String::new(),
        build_metadata: String::new(),
        canonical: String::new(),
        compare_result: None,
        compare_error: None,
        range_satisfied: None,
        range_error: None,
        bumped_major: None,
        bumped_minor: None,
        bumped_patch: None,
        error: None,
    }
}

/// Parse, compare, check ranges, and compute next major/minor/patch versions.
pub fn process(input: SemverInput) -> SemverOutput {
    let trimmed = input.version.trim();
    if trimmed.is_empty() {
        return SemverOutput {
            error: Some("Empty version".to_string()),
            ..empty_result()
        };
    }

    let ver_str = normalize_version_str(trimmed);
    if ver_str.is_empty() {
        return SemverOutput {
            error: Some("Empty version".to_string()),
            ..empty_result()
        };
    }

    let v = match Version::parse(ver_str) {
        Ok(v) => v,
        Err(e) => {
            return SemverOutput {
                error: Some(format!("Invalid version: {e}")),
                ..empty_result()
            };
        }
    };

    let prerelease = if v.pre.is_empty() {
        String::new()
    } else {
        v.pre.to_string()
    };
    let build_metadata = if v.build.is_empty() {
        String::new()
    } else {
        v.build.to_string()
    };

    let canonical = v.to_string();

    let bumped_major = Version {
        major: v.major.saturating_add(1),
        minor: 0,
        patch: 0,
        pre: Prerelease::EMPTY,
        build: BuildMetadata::EMPTY,
    };
    let bumped_minor = Version {
        major: v.major,
        minor: v.minor.saturating_add(1),
        patch: 0,
        pre: Prerelease::EMPTY,
        build: BuildMetadata::EMPTY,
    };
    let bumped_patch = Version {
        major: v.major,
        minor: v.minor,
        patch: v.patch.saturating_add(1),
        pre: Prerelease::EMPTY,
        build: BuildMetadata::EMPTY,
    };

    let (compare_result, compare_error) = match &input.compare_with {
        None => (None, None),
        Some(s) => {
            let c = s.trim();
            if c.is_empty() {
                (None, Some("compareWith is empty".to_string()))
            } else {
                let other_str = normalize_version_str(c);
                match Version::parse(other_str) {
                    Ok(other) => {
                        let cmp = match v.cmp(&other) {
                            Ordering::Less => SemverCompareResult::LessThan,
                            Ordering::Equal => SemverCompareResult::Equal,
                            Ordering::Greater => SemverCompareResult::GreaterThan,
                        };
                        (Some(cmp), None)
                    }
                    Err(e) => (None, Some(format!("Invalid compareWith: {e}"))),
                }
            }
        }
    };

    let (range_satisfied, range_error) = match &input.range {
        None => (None, None),
        Some(s) => {
            let r = s.trim();
            if r.is_empty() {
                (None, Some("range is empty".to_string()))
            } else {
                match VersionReq::parse(r) {
                    Ok(req) => (Some(req.matches(&v)), None),
                    Err(e) => (None, Some(format!("Invalid range: {e}"))),
                }
            }
        }
    };

    SemverOutput {
        major: Some(v.major),
        minor: Some(v.minor),
        patch: Some(v.patch),
        prerelease,
        build_metadata,
        canonical,
        compare_result,
        compare_error,
        range_satisfied,
        range_error,
        bumped_major: Some(bumped_major.to_string()),
        bumped_minor: Some(bumped_minor.to_string()),
        bumped_patch: Some(bumped_patch.to_string()),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_strips_v_prefix() {
        let out = process(SemverInput {
            version: "v1.2.3".to_string(),
            compare_with: None,
            range: None,
        });
        assert!(out.error.is_none());
        assert_eq!(out.canonical, "1.2.3");
        assert_eq!(out.bumped_patch.as_deref(), Some("1.2.4"));
    }

    #[test]
    fn compares_semver_not_lexicographic() {
        let out = process(SemverInput {
            version: "1.10.0".to_string(),
            compare_with: Some("1.9.0".to_string()),
            range: None,
        });
        assert_eq!(out.compare_result, Some(SemverCompareResult::GreaterThan));
    }

    #[test]
    fn range_caret() {
        let out = process(SemverInput {
            version: "1.2.3".to_string(),
            compare_with: None,
            range: Some("^1.0.0".to_string()),
        });
        assert_eq!(out.range_satisfied, Some(true));
        assert!(out.range_error.is_none());
    }

    #[test]
    fn invalid_version_sets_error() {
        let out = process(SemverInput {
            version: "not-a-version".to_string(),
            compare_with: None,
            range: None,
        });
        assert!(out.error.is_some());
        assert!(out.major.is_none());
    }
}
