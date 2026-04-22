use rand::Rng;
use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MacInput {
    pub value: String,
    pub generate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct MacOutput {
    pub hex: String,
    pub colon: String,
    pub dash: String,
    pub dot: String,
    pub oui: String,
    pub vendor: Option<String>,
    pub transmission: String,
    pub scope: String,
    pub error: Option<String>,
}

fn clean_hex(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_hexdigit()).collect::<String>().to_uppercase()
}

fn vendor_for(oui: &str) -> Option<String> {
    let vendors = [
        ("00163E", "Apple"), ("3C5A37", "Google"), ("F4F5D8", "Microsoft"),
        ("001B63", "Cisco"), ("001A2B", "Intel"), ("B827EB", "Raspberry Pi"),
    ];
    vendors.iter().find(|(k, _)| *k == oui).map(|(_, v)| (*v).to_string())
}

pub fn process(input: MacInput) -> MacOutput {
    let hex = if input.generate {
        let mut bytes = [0u8; 6];
        rand::thread_rng().fill(&mut bytes);
        bytes[0] &= 0b1111_1110;
        bytes[0] |= 0b0000_0010;
        bytes.iter().map(|b| format!("{b:02X}")).collect::<String>()
    } else {
        clean_hex(&input.value)
    };
    if hex.len() != 12 {
        return MacOutput {
            hex: String::new(), colon: String::new(), dash: String::new(), dot: String::new(),
            oui: String::new(), vendor: None, transmission: String::new(), scope: String::new(),
            error: Some("MAC must contain 12 hex digits".to_string()),
        };
    }
    let bytes = (0..6)
        .map(|i| u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16).unwrap_or(0))
        .collect::<Vec<_>>();
    let transmission = if (bytes[0] & 0b0000_0001) != 0 { "Multicast" } else { "Unicast" };
    let scope = if (bytes[0] & 0b0000_0010) != 0 { "Local" } else { "Global" };
    let colon = bytes.iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(":");
    let dash = bytes.iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join("-");
    let dot = format!("{}.{}.{}", &hex[0..4], &hex[4..8], &hex[8..12]);
    let oui = hex[0..6].to_string();
    MacOutput {
        hex,
        colon,
        dash,
        dot,
        oui: oui.clone(),
        vendor: vendor_for(&oui),
        transmission: transmission.to_string(),
        scope: scope.to_string(),
        error: None,
    }
}
