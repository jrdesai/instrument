//! CIDR / subnet calculator.

use ipnetwork::IpNetwork;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::str::FromStr;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CidrInput {
    pub cidr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CidrOutput {
    pub network_address: String,
    pub broadcast_address: Option<String>,
    pub subnet_mask: String,
    pub wildcard_mask: String,
    pub first_host: Option<String>,
    pub last_host: Option<String>,
    pub total_hosts: u64,
    pub usable_hosts: u64,
    pub prefix_length: u8,
    pub ip_version: u8,
    pub ip_class: Option<String>,
    pub is_private: bool,
    pub is_loopback: bool,
    pub binary_mask: String,
    /// Number of host bits.
    pub host_bits: u8,
    /// Number of wildcard bits.
    pub wildcard_bits: u8,
    /// IPv6 scope classification.
    pub ipv6_scope: Option<String>,
    /// Human-readable note for special prefix lengths.
    pub special_note: Option<String>,
    /// Subnet split preview.
    pub subnet_split: Option<SubnetSplit>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SubnetSplit {
    pub sub_prefix: u8,
    pub count: u32,
    pub examples: Vec<String>,
}

pub fn process(input: CidrInput) -> CidrOutput {
    let trimmed = input.cidr.trim();
    if trimmed.is_empty() {
        return error_output("Empty input");
    }

    let network = match IpNetwork::from_str(trimmed) {
        Ok(n) => n,
        Err(e) => return error_output(&e.to_string()),
    };

    match network {
        IpNetwork::V4(net) => {
            let prefix = net.prefix();
            let mask = net.mask();
            let network_addr = net.network();
            let broadcast = net.broadcast();
            let host_bits = 32 - prefix;
            let wildcard_bits = host_bits;

            let total: u64 = 2u64.pow((32 - prefix) as u32);
            let usable: u64 = if prefix >= 31 {
                total
            } else {
                total.saturating_sub(2)
            };

            let first_host = if prefix < 31 {
                Some(std::net::Ipv4Addr::from(u32::from(network_addr) + 1).to_string())
            } else {
                None
            };

            let last_host = if prefix < 31 {
                Some(std::net::Ipv4Addr::from(u32::from(broadcast) - 1).to_string())
            } else {
                None
            };

            let mask_u32 = u32::from(mask);
            let wildcard = std::net::Ipv4Addr::from(!mask_u32);

            let binary_mask = format!("{mask_u32:032b}")
                .chars()
                .enumerate()
                .flat_map(|(i, c)| if i > 0 && i % 8 == 0 { vec!['.', c] } else { vec![c] })
                .collect::<String>();

            let first_octet = u32::from(network_addr) >> 24;
            let ip_class = Some(
                match first_octet {
                    0..=127 => "A",
                    128..=191 => "B",
                    192..=223 => "C",
                    224..=239 => "D (Multicast)",
                    _ => "E (Reserved)",
                }
                .to_string(),
            );

            let is_private = network_addr.is_private();
            let special_note = match prefix {
                32 => Some(
                    "A /32 is a host route - single IP, no broadcast or host range.".to_string(),
                ),
                31 => Some(
                    "A /31 is a point-to-point link (RFC 3021) - 2 addresses, both usable, no broadcast."
                        .to_string(),
                ),
                _ => None,
            };

            let subnet_split = if prefix <= 28 {
                let sub_prefix = prefix + 2;
                let count = 4u32;
                let base = u32::from(network_addr);
                let sub_size = 2u32.pow((32 - sub_prefix) as u32);
                let examples: Vec<String> = (0..count.min(4))
                    .map(|i| {
                        let addr = std::net::Ipv4Addr::from(base + i * sub_size);
                        format!("{addr}/{sub_prefix}")
                    })
                    .collect();
                Some(SubnetSplit {
                    sub_prefix,
                    count,
                    examples,
                })
            } else {
                None
            };

            CidrOutput {
                network_address: network_addr.to_string(),
                broadcast_address: Some(broadcast.to_string()),
                subnet_mask: mask.to_string(),
                wildcard_mask: wildcard.to_string(),
                first_host,
                last_host,
                total_hosts: total,
                usable_hosts: usable,
                prefix_length: prefix,
                ip_version: 4,
                ip_class,
                is_private,
                is_loopback: network_addr.is_loopback(),
                binary_mask,
                host_bits,
                wildcard_bits,
                ipv6_scope: None,
                special_note,
                subnet_split,
                error: None,
            }
        }
        IpNetwork::V6(net) => {
            let prefix = net.prefix();
            let host_bits = 128 - prefix;
            let wildcard_bits = host_bits.min(64);
            let total_bits = 128u64.saturating_sub(prefix as u64);
            let total_hosts = if total_bits >= 64 {
                u64::MAX
            } else {
                2u64.pow(total_bits as u32)
            };
            let ip = net.network();
            let ipv6_scope = Some(classify_ipv6_scope(ip));
            let special_note = match prefix {
                128 => Some("A /128 is a host route - single IPv6 address.".to_string()),
                127 => Some(
                    "A /127 is a point-to-point link (RFC 6164) - 2 addresses, both usable."
                        .to_string(),
                ),
                _ => None,
            };
            let subnet_split = if prefix <= 126 {
                let sub_prefix = prefix + 2;
                let count = 4u32;
                let examples: Vec<String> = (0..count)
                    .map(|i| {
                        let offset = (i as u128) << (128 - sub_prefix as u32);
                        let base = u128::from(ip);
                        let addr = std::net::Ipv6Addr::from(base + offset);
                        format!("{addr}/{sub_prefix}")
                    })
                    .collect();
                Some(SubnetSplit {
                    sub_prefix,
                    count,
                    examples,
                })
            } else {
                None
            };

            CidrOutput {
                network_address: net.network().to_string(),
                broadcast_address: None,
                subnet_mask: net.mask().to_string(),
                wildcard_mask: String::new(),
                first_host: None,
                last_host: None,
                total_hosts,
                usable_hosts: total_hosts,
                prefix_length: prefix,
                ip_version: 6,
                ip_class: None,
                is_private: net.ip().is_unique_local(),
                is_loopback: net.network().is_loopback(),
                binary_mask: String::new(),
                host_bits,
                wildcard_bits,
                ipv6_scope,
                special_note,
                subnet_split,
                error: None,
            }
        }
    }
}

fn classify_ipv6_scope(ip: std::net::Ipv6Addr) -> String {
    let segments = ip.segments();
    let first = segments[0];
    if ip.is_loopback() {
        "loopback".to_string()
    } else if ip.is_unspecified() {
        "unspecified".to_string()
    } else if first & 0xff00 == 0xff00 {
        "multicast".to_string()
    } else if first & 0xffc0 == 0xfe80 {
        "link-local".to_string()
    } else if first & 0xfe00 == 0xfc00 {
        "ula".to_string()
    } else if first & 0xe000 == 0x2000 {
        "global-unicast".to_string()
    } else {
        "other".to_string()
    }
}

fn error_output(msg: &str) -> CidrOutput {
    CidrOutput {
        network_address: String::new(),
        broadcast_address: None,
        subnet_mask: String::new(),
        wildcard_mask: String::new(),
        first_host: None,
        last_host: None,
        total_hosts: 0,
        usable_hosts: 0,
        prefix_length: 0,
        ip_version: 4,
        ip_class: None,
        is_private: false,
        is_loopback: false,
        binary_mask: String::new(),
        host_bits: 0,
        wildcard_bits: 0,
        ipv6_scope: None,
        special_note: None,
        subnet_split: None,
        error: Some(msg.to_string()),
    }
}
