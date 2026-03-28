use fancy_regex::Regex;

use crate::types::{MatchResult, RegexRequest};

pub fn run(req: &RegexRequest) -> Result<Vec<MatchResult>, String> {
    let re =
        Regex::new(&req.pattern).map_err(|e| format!("Invalid pattern: {}", e))?;

    let mut results = Vec::new();

    for cap in re.captures_iter(&req.text) {
        let cap = cap.map_err(|e| format!("Match error: {}", e))?;

        if let Some(m) = cap.get(0) {
            results.push(MatchResult {
                start: u32::try_from(m.start()).unwrap_or(u32::MAX),
                end: u32::try_from(m.end()).unwrap_or(u32::MAX),
                value: m.as_str().to_string(),
                groups: cap
                    .iter()
                    .skip(1)
                    .map(|g| g.map(|m| m.as_str().to_string()))
                    .collect(),
            });
        }
    }

    Ok(results)
}

