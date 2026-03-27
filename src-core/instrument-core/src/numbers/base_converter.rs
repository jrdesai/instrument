//! Number base conversion: parse a number in one base and output all bases.
//!
//! Supports decimal, hex, binary, octal, Crockford Base32, and base36.
//! Uses u128 internally for large numbers.

use serde::{Deserialize, Serialize};

/// Input base for the number string.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NumberBase {
    Decimal,
    Hexadecimal,
    Binary,
    Octal,
    Base32,
    Base36,
}

/// Bit width for binary output (padding and grouping).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BitWidth {
    Auto,
    Bit8,
    Bit16,
    Bit32,
    Bit64,
}

/// Input for the base converter.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseConverterInput {
    pub value: String,
    pub from_base: NumberBase,
    pub bit_width: BitWidth,
    pub uppercase_hex: bool,
}

/// Output: the value in every supported base.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseConverterOutput {
    pub decimal: String,
    pub hexadecimal: String,
    pub binary: String,
    pub binary_grouped: String,
    pub octal: String,
    pub base32: String,
    pub base36: String,
    pub bit_length: usize,
    pub is_negative: bool,
    pub error: Option<String>,
}

fn empty_output(error: Option<String>) -> BaseConverterOutput {
    BaseConverterOutput {
        decimal: String::new(),
        hexadecimal: String::new(),
        binary: String::new(),
        binary_grouped: String::new(),
        octal: String::new(),
        base32: String::new(),
        base36: String::new(),
        bit_length: 0,
        is_negative: false,
        error,
    }
}

/// Strip optional prefix (0x, 0b, 0o) and leading minus. Returns (rest, is_negative).
fn strip_prefix(s: &str, base: NumberBase) -> (&str, bool) {
    let s = s.trim();
    let is_neg = s.starts_with('-');
    let s = if is_neg { s[1..].trim_start() } else { s };
    let s = match base {
        NumberBase::Hexadecimal if s.len() >= 2 && (s.starts_with("0x") || s.starts_with("0X")) => {
            &s[2..]
        }
        NumberBase::Binary if s.len() >= 2 && (s.starts_with("0b") || s.starts_with("0B")) => &s[2..],
        NumberBase::Octal if s.len() >= 2 && (s.starts_with("0o") || s.starts_with("0O")) => &s[2..],
        _ => s,
    };
    (s, is_neg)
}

fn parse_digit_hex(c: char) -> Option<u32> {
    match c {
        '0'..='9' => Some(c as u32 - b'0' as u32),
        'a'..='f' => Some(c as u32 - 'a' as u32 + 10),
        'A'..='F' => Some(c as u32 - 'A' as u32 + 10),
        _ => None,
    }
}

fn parse_digit_base36(c: char) -> Option<u32> {
    match c {
        '0'..='9' => Some(c as u32 - b'0' as u32),
        'a'..='z' => Some(c as u32 - 'a' as u32 + 10),
        'A'..='Z' => Some(c as u32 - 'A' as u32 + 10),
        _ => None,
    }
}

/// Crockford Base32 alphabet (no I, L, O, U).
const CROCKFORD_B32: &[u8] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

fn parse_digit_base32(c: char) -> Option<u32> {
    let c = c.to_ascii_uppercase();
    let c = match c {
        'I' | 'L' => '1',
        'O' => '0',
        'U' => return None,
        _ => c,
    };
    if c.is_ascii_digit() {
        return Some(c as u32 - b'0' as u32);
    }
    if c.is_ascii_uppercase() && !matches!(c, 'I' | 'L' | 'O' | 'U') {
        let idx = CROCKFORD_B32.iter().position(|&b| b == c as u8)?;
        return Some(idx as u32);
    }
    None
}

trait ToAsciiUppercase {
    fn to_ascii_uppercase(self) -> char;
}
impl ToAsciiUppercase for char {
    fn to_ascii_uppercase(self) -> char {
        if self.is_ascii_lowercase() {
            (self as u8 - 32) as char
        } else {
            self
        }
    }
}

/// Parse string in given base to u128. Returns error message on invalid input or overflow.
fn parse_to_u128(s: &str, base: NumberBase) -> Result<(u128, bool), String> {
    let (s, is_negative) = strip_prefix(s, base);
    if s.is_empty() {
        return Ok((0, is_negative));
    }
    let radix: u32 = match base {
        NumberBase::Decimal => 10,
        NumberBase::Hexadecimal => 16,
        NumberBase::Binary => 2,
        NumberBase::Octal => 8,
        NumberBase::Base32 => 32,
        NumberBase::Base36 => 36,
    };
    let mut value: u128 = 0;
    for c in s.chars() {
        if c.is_whitespace() || c == '_' {
            continue;
        }
        let d = match base {
            NumberBase::Hexadecimal => parse_digit_hex(c),
            NumberBase::Binary => {
                if c == '0' || c == '1' {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
            NumberBase::Octal => {
                if ('0'..='7').contains(&c) {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
            NumberBase::Decimal => {
                if c.is_ascii_digit() {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
            NumberBase::Base32 => parse_digit_base32(c),
            NumberBase::Base36 => parse_digit_base36(c),
        };
        let d = d.ok_or_else(|| format!("Invalid character '{}' for {:?} input", c, base))?;
        if d >= radix {
            return Err(format!("Invalid character '{}' for {:?} input", c, base));
        }
        value = value
            .checked_mul(radix as u128)
            .and_then(|v| v.checked_add(d as u128))
            .ok_or_else(|| "Value exceeds maximum (u128::MAX)".to_string())?;
    }
    Ok((value, is_negative))
}

fn to_base_string(mut n: u128, radix: u32, digits: &[char]) -> String {
    if n == 0 {
        return "0".to_string();
    }
    let radix = radix as u128;
    let mut out = Vec::new();
    while n > 0 {
        out.push(digits[(n % radix) as usize]);
        n /= radix;
    }
    out.into_iter().rev().collect()
}

fn to_hex(n: u128, uppercase: bool) -> String {
    if n == 0 {
        return "0".to_string();
    }
    let digits = if uppercase {
        "0123456789ABCDEF"
    } else {
        "0123456789abcdef"
    };
    let digits: Vec<char> = digits.chars().collect();
    to_base_string(n, 16, &digits)
}

fn to_crockford_base32(mut n: u128) -> String {
    if n == 0 {
        return "0".to_string();
    }
    let mut out = Vec::new();
    while n > 0 {
        out.push(CROCKFORD_B32[(n % 32) as usize] as char);
        n /= 32;
    }
    out.into_iter().rev().collect()
}

fn to_base36(n: u128) -> String {
    const B36: &[char] = &[
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
        'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    ];
    to_base_string(n, 36, B36)
}

fn bit_length(n: u128) -> usize {
    if n == 0 {
        return 1;
    }
    (128 - n.leading_zeros()) as usize
}

fn pad_binary(s: &str, width: usize) -> String {
    if s.len() >= width {
        return s.to_string();
    }
    let pad = width - s.len();
    "0".repeat(pad) + s
}

fn group_binary(s: &str, group_size: usize) -> String {
    let s = s.trim_start_matches('0');
    let s = if s.is_empty() { "0" } else { s };
    let chars: Vec<char> = s.chars().collect();
    let len = chars.len();
    let mut out = String::new();
    let first_len = if len.is_multiple_of(group_size) {
        group_size
    } else {
        len % group_size
    };
    for &c in chars.iter().take(first_len) {
        out.push(c);
    }
    for chunk in chars[first_len..].chunks(group_size) {
        if !out.is_empty() {
            out.push(' ');
        }
        for &c in chunk {
            out.push(c);
        }
    }
    out
}

/// Process base conversion.
///
/// # Example
///
/// ```
/// use instrument_core::numbers::base_converter::{
///     process, BaseConverterInput, NumberBase, BitWidth,
/// };
///
/// let out = process(BaseConverterInput {
///     value: "255".to_string(),
///     from_base: NumberBase::Decimal,
///     bit_width: BitWidth::Auto,
///     uppercase_hex: false,
/// });
/// assert_eq!(out.decimal, "255");
/// assert_eq!(out.hexadecimal, "ff");
/// assert_eq!(out.binary, "11111111");
/// assert_eq!(out.octal, "377");
/// ```
pub fn process(input: BaseConverterInput) -> BaseConverterOutput {
    if input.value.trim().is_empty() {
        return empty_output(None);
    }
    let (value, is_negative) = match parse_to_u128(&input.value, input.from_base) {
        Ok(x) => x,
        Err(e) => return empty_output(Some(e)),
    };

    let dec = value.to_string();
    let hex = to_hex(value, input.uppercase_hex);
    let bin_bare = to_base_string(
        value,
        2,
        &['0', '1'],
    );
    let bits = bit_length(value);
    let pad_width = match input.bit_width {
        BitWidth::Auto => bits,
        BitWidth::Bit8 => 8,
        BitWidth::Bit16 => 16,
        BitWidth::Bit32 => 32,
        BitWidth::Bit64 => 64,
    };
    let binary = pad_binary(&bin_bare, pad_width);
    let binary_grouped = group_binary(&binary, 4);
    let octal = to_base_string(value, 8, &['0', '1', '2', '3', '4', '5', '6', '7']);
    let base32 = to_crockford_base32(value);
    let base36 = to_base36(value);

    BaseConverterOutput {
        decimal: dec.clone(),
        hexadecimal: hex,
        binary: binary.clone(),
        binary_grouped,
        octal,
        base32,
        base36,
        bit_length: bits,
        is_negative,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decimal_255() {
        let out = process(BaseConverterInput {
            value: "255".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.hexadecimal, "ff");
        assert_eq!(out.binary, "11111111");
        assert_eq!(out.octal, "377");
        assert!(out.error.is_none());
    }

    #[test]
    fn hex_ff() {
        let out = process(BaseConverterInput {
            value: "ff".to_string(),
            from_base: NumberBase::Hexadecimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "255");
        assert_eq!(out.binary, "11111111");
    }

    #[test]
    fn hex_with_prefix() {
        let out = process(BaseConverterInput {
            value: "0xFF".to_string(),
            from_base: NumberBase::Hexadecimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "255");
        assert_eq!(out.binary, "11111111");
    }

    #[test]
    fn binary_input() {
        let out = process(BaseConverterInput {
            value: "11111111".to_string(),
            from_base: NumberBase::Binary,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "255");
        assert_eq!(out.hexadecimal, "ff");
    }

    #[test]
    fn octal_input() {
        let out = process(BaseConverterInput {
            value: "377".to_string(),
            from_base: NumberBase::Octal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "255");
    }

    #[test]
    fn negative() {
        let out = process(BaseConverterInput {
            value: "-1".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert!(out.is_negative);
        assert_eq!(out.decimal, "1");
    }

    #[test]
    fn zero() {
        let out = process(BaseConverterInput {
            value: "0".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "0");
        assert_eq!(out.hexadecimal, "0");
        assert_eq!(out.binary, "0");
        assert_eq!(out.octal, "0");
    }

    #[test]
    fn binary_grouped() {
        let out = process(BaseConverterInput {
            value: "255".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.binary_grouped, "1111 1111");
    }

    #[test]
    fn bit_width_8() {
        let out = process(BaseConverterInput {
            value: "1".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Bit8,
            uppercase_hex: false,
        });
        assert_eq!(out.binary, "00000001");
    }

    #[test]
    fn bit_width_16() {
        let out = process(BaseConverterInput {
            value: "255".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Bit16,
            uppercase_hex: false,
        });
        assert_eq!(out.binary, "0000000011111111");
    }

    #[test]
    fn invalid_hex() {
        let out = process(BaseConverterInput {
            value: "0xGG".to_string(),
            from_base: NumberBase::Hexadecimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert!(out.error.is_some());
        assert!(out.error.unwrap().contains('G'));
    }

    #[test]
    fn invalid_binary() {
        let out = process(BaseConverterInput {
            value: "2".to_string(),
            from_base: NumberBase::Binary,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert!(out.error.is_some());
    }

    #[test]
    fn empty_input() {
        let out = process(BaseConverterInput {
            value: "".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert!(out.decimal.is_empty());
        assert!(out.error.is_none());
    }

    #[test]
    fn large_number() {
        let out = process(BaseConverterInput {
            value: "18446744073709551615".to_string(), // u64::MAX
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: false,
        });
        assert_eq!(out.decimal, "18446744073709551615");
        assert_eq!(out.hexadecimal, "ffffffffffffffff");
        assert_eq!(out.binary.len(), 64);
    }

    #[test]
    fn uppercase_hex() {
        let out = process(BaseConverterInput {
            value: "255".to_string(),
            from_base: NumberBase::Decimal,
            bit_width: BitWidth::Auto,
            uppercase_hex: true,
        });
        assert_eq!(out.hexadecimal, "FF");
    }
}
