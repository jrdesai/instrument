use regex::Regex;

use crate::types::{MatchResult, RegexRequest};

pub fn run(req: &RegexRequest) -> Result<Vec<MatchResult>, String> {
    let re =
        Regex::new(&req.pattern).map_err(|e| format!("Invalid pattern: {}", e))?;

    let results = re
        .captures_iter(&req.text)
        .map(|cap| {
            let m = cap.get(0).expect("capture group 0 must exist");
            MatchResult {
                start: m.start(),
                end: m.end(),
                value: m.as_str().to_string(),
                groups: cap
                    .iter()
                    .skip(1)
                    .map(|g| g.map(|m| m.as_str().to_string()))
                    .collect(),
            }
        })
        .collect();

    Ok(results)
}

