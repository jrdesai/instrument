//! DNS Lookup — resolve DNS records using the system's configured resolver.
//!
//! Resolution logic is gated on `#[cfg(not(target_arch = "wasm32"))]` because
//! it requires OS-level network calls unavailable in WASM. Structs compile on
//! all targets for ts-rs type generation.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DnsLookupInput {
    pub domain: String,
    /// One of: "A", "AAAA", "MX", "TXT", "CNAME", "NS"
    pub record_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DnsRecord {
    pub value: String,
    pub ttl: u32,
    /// MX priority only — None for all other record types
    pub priority: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct DnsLookupOutput {
    pub domain: String,
    pub record_type: String,
    pub records: Vec<DnsRecord>,
    pub error: Option<String>,
}

fn empty(domain: String, record_type: String) -> DnsLookupOutput {
    DnsLookupOutput {
        domain,
        record_type,
        records: vec![],
        error: None,
    }
}

fn err(domain: String, record_type: String, msg: String) -> DnsLookupOutput {
    DnsLookupOutput {
        domain,
        record_type,
        records: vec![],
        error: Some(msg),
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub fn process(input: DnsLookupInput) -> DnsLookupOutput {
    use hickory_resolver::proto::rr::RecordType;
    use hickory_resolver::Resolver;

    let domain = input.domain.trim().to_string();
    let record_type_str = input.record_type.trim().to_uppercase();

    if domain.is_empty() {
        return empty(domain, record_type_str);
    }

    // Absolute FQDN — prevents search domain appending.
    let fqdn = if domain.ends_with('.') {
        domain.clone()
    } else {
        format!("{}.", domain)
    };

    let resolver = match Resolver::from_system_conf() {
        Ok(r) => r,
        Err(e) => {
            return err(
                domain,
                record_type_str,
                format!("Failed to initialise resolver: {e}"),
            )
        }
    };

    let records: Vec<DnsRecord> = match record_type_str.as_str() {
        "A" | "AAAA" => match resolver.lookup_ip(fqdn.as_str()) {
            Ok(resp) => {
                let ttl = resp
                    .as_lookup()
                    .record_iter()
                    .next()
                    .map(|r| r.ttl())
                    .unwrap_or(0);
                resp.iter()
                    .filter(|ip| {
                        (record_type_str == "A" && ip.is_ipv4())
                            || (record_type_str == "AAAA" && ip.is_ipv6())
                    })
                    .map(|ip| DnsRecord {
                        value: ip.to_string(),
                        ttl,
                        priority: None,
                    })
                    .collect()
            }
            Err(e) => return err(domain, record_type_str, e.to_string()),
        },
        "MX" => match resolver.mx_lookup(fqdn.as_str()) {
            Ok(resp) => {
                let ttl = resp
                    .as_lookup()
                    .record_iter()
                    .next()
                    .map(|r| r.ttl())
                    .unwrap_or(0);
                let mut records: Vec<DnsRecord> = resp
                    .iter()
                    .map(|mx| DnsRecord {
                        value: mx.exchange().to_string(),
                        ttl,
                        priority: Some(mx.preference()),
                    })
                    .collect();
                records.sort_by_key(|r| r.priority);
                records
            }
            Err(e) => return err(domain, record_type_str, e.to_string()),
        },
        "TXT" => match resolver.txt_lookup(fqdn.as_str()) {
            Ok(resp) => {
                let ttl = resp
                    .as_lookup()
                    .record_iter()
                    .next()
                    .map(|r| r.ttl())
                    .unwrap_or(0);
                resp.iter()
                    .map(|txt| DnsRecord {
                        value: txt
                            .iter()
                            .map(|b| String::from_utf8_lossy(b).into_owned())
                            .collect::<Vec<_>>()
                            .join(""),
                        ttl,
                        priority: None,
                    })
                    .collect()
            }
            Err(e) => return err(domain, record_type_str, e.to_string()),
        },
        "NS" => match resolver.ns_lookup(fqdn.as_str()) {
            Ok(resp) => {
                let ttl = resp
                    .as_lookup()
                    .record_iter()
                    .next()
                    .map(|r| r.ttl())
                    .unwrap_or(0);
                resp.iter()
                    .map(|ns| DnsRecord {
                        value: ns.0.to_string(),
                        ttl,
                        priority: None,
                    })
                    .collect()
            }
            Err(e) => return err(domain, record_type_str, e.to_string()),
        },
        "CNAME" => match resolver.lookup(fqdn.as_str(), RecordType::CNAME) {
            Ok(resp) => resp
                .record_iter()
                .filter_map(|r| {
                    r.data().and_then(|d| d.as_cname()).map(|cname| DnsRecord {
                        value: cname.0.to_string(),
                        ttl: r.ttl(),
                        priority: None,
                    })
                })
                .collect(),
            Err(e) => return err(domain, record_type_str, e.to_string()),
        },
        _ => return err(domain, record_type_str, "Unsupported record type".into()),
    };

    DnsLookupOutput {
        domain,
        record_type: record_type_str,
        records,
        error: None,
    }
}

