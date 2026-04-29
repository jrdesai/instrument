//! IP address inspector: classify IPv4/IPv6 addresses, show type, range, RFC, and format conversions.
//! Fully offline — no DNS or network calls.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct IpInspectInput {
    pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct IpInspectOutput {
    /// "IPv4" or "IPv6"
    pub version: String,
    /// e.g. "Private", "Public", "Loopback", "Link-local", "Multicast"
    pub ip_type: String,
    /// Plain-English explanation of what this address is used for
    pub description: String,
    /// CIDR range this address belongs to, e.g. "192.168.0.0/16"
    pub range: Option<String>,
    /// Defining RFC, e.g. "RFC 1918"
    pub rfc: Option<String>,
    // ── IPv4 only ────────────────────────────────────────
    /// Dot-separated binary octets: "11000000.10101000.00000001.00000001"
    pub binary: Option<String>,
    /// Uppercase hex without prefix: "C0A80101"
    pub hex: Option<String>,
    /// Unsigned 32-bit decimal integer: 3232235777
    pub decimal: Option<u32>,
    // ── IPv6 only ────────────────────────────────────────
    /// Full expanded form: "fe80:0000:0000:0000:0000:0000:0000:0001"
    pub expanded: Option<String>,
    /// Standard compressed form: "fe80::1"
    pub compressed: Option<String>,
    /// If IPv4-mapped (::ffff:x.x.x.x), the embedded IPv4 address
    pub ipv4_mapped: Option<String>,
    pub error: Option<String>,
}

pub fn process(input: IpInspectInput) -> IpInspectOutput {
    let trimmed = input.address.trim();
    if trimmed.is_empty() {
        return empty_output();
    }

    match trimmed.parse::<IpAddr>() {
        Ok(IpAddr::V4(addr)) => inspect_v4(addr),
        Ok(IpAddr::V6(addr)) => inspect_v6(addr),
        Err(_) => IpInspectOutput {
            error: Some(format!(
                "\"{}\" is not a valid IPv4 or IPv6 address",
                trimmed
            )),
            ..empty_output()
        },
    }
}

fn inspect_v4(addr: Ipv4Addr) -> IpInspectOutput {
    let octets = addr.octets();
    let decimal = u32::from(addr);
    let binary = octets
        .iter()
        .map(|o| format!("{:08b}", o))
        .collect::<Vec<_>>()
        .join(".");
    let hex = format!(
        "{:02X}{:02X}{:02X}{:02X}",
        octets[0], octets[1], octets[2], octets[3]
    );

    let (ip_type, description, range, rfc) = classify_v4(&addr);

    IpInspectOutput {
        version: "IPv4".into(),
        ip_type,
        description,
        range,
        rfc,
        binary: Some(binary),
        hex: Some(hex),
        decimal: Some(decimal),
        expanded: None,
        compressed: None,
        ipv4_mapped: None,
        error: None,
    }
}

fn classify_v4(addr: &Ipv4Addr) -> (String, String, Option<String>, Option<String>) {
    let [a, b, c, _d] = addr.octets();

    if addr.is_loopback() {
        return (
            "Loopback".into(),
            "Reserved for loopback communication within the host itself.".into(),
            Some("127.0.0.0/8".into()),
            Some("RFC 5735".into()),
        );
    }
    if addr.is_unspecified() {
        return (
            "Unspecified".into(),
            "Represents the absence of an address (0.0.0.0).".into(),
            Some("0.0.0.0/8".into()),
            Some("RFC 5735".into()),
        );
    }
    if addr.is_broadcast() {
        return (
            "Broadcast".into(),
            "Limited broadcast address — delivered to all hosts on the local network.".into(),
            Some("255.255.255.255/32".into()),
            Some("RFC 919".into()),
        );
    }
    if addr.is_private() {
        let (range, rfc) = if a == 10 {
            ("10.0.0.0/8", "RFC 1918")
        } else if a == 172 {
            ("172.16.0.0/12", "RFC 1918")
        } else {
            ("192.168.0.0/16", "RFC 1918")
        };
        return (
            "Private".into(),
            "Private address space — not routable on the public internet.".into(),
            Some(range.into()),
            Some(rfc.into()),
        );
    }
    if addr.is_link_local() {
        return (
            "Link-local".into(),
            "Self-assigned when no DHCP server is available (APIPA). Not routed beyond the local link.".into(),
            Some("169.254.0.0/16".into()),
            Some("RFC 3927".into()),
        );
    }
    // CGNAT / Shared Address Space
    if a == 100 && (b & 0xC0) == 64 {
        return (
            "Shared / CGNAT".into(),
            "Shared address space used by ISPs for Carrier-Grade NAT. Not routable on the public internet.".into(),
            Some("100.64.0.0/10".into()),
            Some("RFC 6598".into()),
        );
    }
    if addr.is_multicast() {
        return (
            "Multicast".into(),
            "Multicast address — used to deliver packets to a group of interested receivers.".into(),
            Some("224.0.0.0/4".into()),
            Some("RFC 5771".into()),
        );
    }
    // Documentation
    if (a == 192 && b == 0 && c == 2)
        || (a == 198 && b == 51 && c == 100)
        || (a == 203 && b == 0 && c == 113)
    {
        return (
            "Documentation".into(),
            "Reserved for use in documentation and examples. Never assigned to real hosts.".into(),
            None,
            Some("RFC 5737".into()),
        );
    }
    // Reserved (future use)
    if a >= 240 {
        return (
            "Reserved".into(),
            "Reserved for future use. Not allocated for any current purpose.".into(),
            Some("240.0.0.0/4".into()),
            Some("RFC 1112".into()),
        );
    }

    (
        "Public".into(),
        "Globally routable address on the public internet.".into(),
        None,
        None,
    )
}

fn inspect_v6(addr: Ipv6Addr) -> IpInspectOutput {
    let compressed = addr.to_string();
    let segments = addr.segments();
    let expanded = segments
        .iter()
        .map(|s| format!("{:04x}", s))
        .collect::<Vec<_>>()
        .join(":");

    let ipv4_mapped = addr.to_ipv4().map(|v4| v4.to_string());
    let (ip_type, description, range, rfc) = classify_v6(&addr);

    IpInspectOutput {
        version: "IPv6".into(),
        ip_type,
        description,
        range,
        rfc,
        binary: None,
        hex: None,
        decimal: None,
        expanded: Some(expanded),
        compressed: Some(compressed),
        ipv4_mapped,
        error: None,
    }
}

fn classify_v6(addr: &Ipv6Addr) -> (String, String, Option<String>, Option<String>) {
    if addr.is_loopback() {
        return (
            "Loopback".into(),
            "The IPv6 loopback address, equivalent to 127.0.0.1 in IPv4.".into(),
            Some("::1/128".into()),
            Some("RFC 4291".into()),
        );
    }
    if addr.is_unspecified() {
        return (
            "Unspecified".into(),
            "Represents the absence of an address.".into(),
            Some("::/128".into()),
            Some("RFC 4291".into()),
        );
    }
    if addr.is_multicast() {
        return (
            "Multicast".into(),
            "Multicast address — delivered to a group of interested nodes.".into(),
            Some("ff00::/8".into()),
            Some("RFC 4291".into()),
        );
    }
    let segs = addr.segments();
    // Link-local: fe80::/10
    if segs[0] & 0xFFC0 == 0xFE80 {
        return (
            "Link-local".into(),
            "Link-local address — only valid on the local network segment, not routed.".into(),
            Some("fe80::/10".into()),
            Some("RFC 4291".into()),
        );
    }
    // Unique local: fc00::/7
    if segs[0] & 0xFE00 == 0xFC00 {
        return (
            "Unique local".into(),
            "Private address space for IPv6, similar to RFC 1918 private ranges in IPv4.".into(),
            Some("fc00::/7".into()),
            Some("RFC 4193".into()),
        );
    }
    // Documentation: 2001:db8::/32
    if segs[0] == 0x2001 && segs[1] == 0x0db8 {
        return (
            "Documentation".into(),
            "Reserved for use in documentation and examples.".into(),
            Some("2001:db8::/32".into()),
            Some("RFC 3849".into()),
        );
    }
    // Teredo: 2001::/32
    if segs[0] == 0x2001 && segs[1] == 0x0000 {
        return (
            "Teredo".into(),
            "Teredo tunnelling — encapsulates IPv6 packets within IPv4 UDP.".into(),
            Some("2001::/32".into()),
            Some("RFC 4380".into()),
        );
    }
    // 6to4: 2002::/16
    if segs[0] == 0x2002 {
        return (
            "6to4".into(),
            "6to4 tunnelling — encodes an IPv4 address in an IPv6 prefix.".into(),
            Some("2002::/16".into()),
            Some("RFC 3056".into()),
        );
    }
    // IPv4-mapped: ::ffff:0:0/96
    if addr.to_ipv4().is_some() {
        return (
            "IPv4-mapped".into(),
            "An IPv4 address represented in IPv6 notation.".into(),
            Some("::ffff:0:0/96".into()),
            Some("RFC 4291".into()),
        );
    }
    // Global unicast: 2000::/3
    if segs[0] & 0xE000 == 0x2000 {
        return (
            "Global unicast".into(),
            "Globally routable IPv6 address on the public internet.".into(),
            Some("2000::/3".into()),
            Some("RFC 4291".into()),
        );
    }

    (
        "Unknown".into(),
        "Address type could not be classified.".into(),
        None,
        None,
    )
}

fn empty_output() -> IpInspectOutput {
    IpInspectOutput {
        version: String::new(),
        ip_type: String::new(),
        description: String::new(),
        range: None,
        rfc: None,
        binary: None,
        hex: None,
        decimal: None,
        expanded: None,
        compressed: None,
        ipv4_mapped: None,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inspect(addr: &str) -> IpInspectOutput {
        process(IpInspectInput {
            address: addr.to_string(),
        })
    }

    #[test]
    fn ipv4_private_10() {
        let out = inspect("10.0.0.1");
        assert_eq!(out.version, "IPv4");
        assert_eq!(out.ip_type, "Private");
        assert_eq!(out.range.as_deref(), Some("10.0.0.0/8"));
    }

    #[test]
    fn ipv4_private_192_168() {
        let out = inspect("192.168.1.100");
        assert_eq!(out.ip_type, "Private");
        assert_eq!(out.range.as_deref(), Some("192.168.0.0/16"));
    }

    #[test]
    fn ipv4_loopback() {
        let out = inspect("127.0.0.1");
        assert_eq!(out.ip_type, "Loopback");
        assert!(out.error.is_none());
    }

    #[test]
    fn ipv4_public() {
        let out = inspect("8.8.8.8");
        assert_eq!(out.ip_type, "Public");
        assert_eq!(out.decimal, Some(134744072));
        assert!(out.binary.is_some());
        assert!(out.hex.is_some());
    }

    #[test]
    fn ipv4_binary_and_hex() {
        let out = inspect("192.168.1.1");
        assert_eq!(
            out.binary.as_deref(),
            Some("11000000.10101000.00000001.00000001")
        );
        assert_eq!(out.hex.as_deref(), Some("C0A80101"));
        assert_eq!(out.decimal, Some(3232235777));
    }

    #[test]
    fn ipv4_multicast() {
        let out = inspect("224.0.0.1");
        assert_eq!(out.ip_type, "Multicast");
    }

    #[test]
    fn ipv6_loopback() {
        let out = inspect("::1");
        assert_eq!(out.version, "IPv6");
        assert_eq!(out.ip_type, "Loopback");
    }

    #[test]
    fn ipv6_link_local() {
        let out = inspect("fe80::1");
        assert_eq!(out.ip_type, "Link-local");
        assert_eq!(out.range.as_deref(), Some("fe80::/10"));
    }

    #[test]
    fn ipv6_expanded() {
        let out = inspect("fe80::1");
        assert_eq!(
            out.expanded.as_deref(),
            Some("fe80:0000:0000:0000:0000:0000:0000:0001")
        );
    }

    #[test]
    fn invalid_address_returns_error() {
        let out = inspect("not-an-ip");
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_input_returns_no_error() {
        let out = inspect("  ");
        assert!(out.error.is_none());
        assert!(out.version.is_empty());
    }

    #[test]
    fn ipv4_cgnat() {
        let out = inspect("100.64.0.1");
        assert_eq!(out.ip_type, "Shared / CGNAT");
        assert_eq!(out.range.as_deref(), Some("100.64.0.0/10"));
        assert!(out.error.is_none());
    }

    #[test]
    fn ipv6_teredo() {
        let out = inspect("2001::1");
        assert_eq!(out.version, "IPv6");
        assert_eq!(out.ip_type, "Teredo");
        assert_eq!(out.range.as_deref(), Some("2001::/32"));
        assert!(out.error.is_none());
    }

    #[test]
    fn ipv6_6to4() {
        let out = inspect("2002::1");
        assert_eq!(out.version, "IPv6");
        assert_eq!(out.ip_type, "6to4");
        assert_eq!(out.range.as_deref(), Some("2002::/16"));
        assert!(out.error.is_none());
    }

    #[test]
    fn ipv6_ipv4_mapped() {
        let out = inspect("::ffff:192.168.1.1");
        assert_eq!(out.version, "IPv6");
        assert_eq!(out.ip_type, "IPv4-mapped");
        assert!(out.ipv4_mapped.is_some());
        assert!(out.error.is_none());
    }
}
