//! Bitwise operations: AND, OR, XOR, NOT, shifts, rotates, and bit analysis.
//!
//! Operates within a chosen bit width (8, 16, 32, 64). All results are
//! masked to that width (e.g. NOT of 60 in 8 bits = 195).

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

/// Input base for parsing value A and B.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BitwiseBase {
    Decimal,
    Hexadecimal,
    Binary,
    Octal,
}

/// Bit width for all operations (determines integer type: u8, u16, u32, u64).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BitwiseWidth {
    Bit8,
    Bit16,
    Bit32,
    Bit64,
}

/// Input for the bitwise calculator.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BitwiseInput {
    pub value_a: String,
    pub value_b: String,
    pub from_base: BitwiseBase,
    pub bit_width: BitwiseWidth,
    pub shift_amount: u32,
}

/// One operation result in multiple bases.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BitwiseResult {
    pub decimal: String,
    pub hexadecimal: String,
    pub binary: String,
    pub binary_grouped: String,
    pub octal: String,
}

/// Output: two-operand ops, single-operand ops, and bit analysis of A.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BitwiseOutput {
    pub and: Option<BitwiseResult>,
    pub or: Option<BitwiseResult>,
    pub xor: Option<BitwiseResult>,
    pub nand: Option<BitwiseResult>,
    pub nor: Option<BitwiseResult>,
    pub not_a: Option<BitwiseResult>,
    pub shift_left: Option<BitwiseResult>,
    pub shift_right: Option<BitwiseResult>,
    pub rotate_left: Option<BitwiseResult>,
    pub rotate_right: Option<BitwiseResult>,
    pub bit_count_a: Option<usize>,
    pub leading_zeros_a: Option<usize>,
    pub trailing_zeros_a: Option<usize>,
    pub is_power_of_two_a: Option<bool>,
    pub error: Option<String>,
}

fn strip_prefix(s: &str, base: BitwiseBase) -> &str {
    let s = s.trim();
    match base {
        BitwiseBase::Hexadecimal if s.len() >= 2 && (s.starts_with("0x") || s.starts_with("0X")) => {
            &s[2..]
        }
        BitwiseBase::Binary if s.len() >= 2 && (s.starts_with("0b") || s.starts_with("0B")) => &s[2..],
        BitwiseBase::Octal if s.len() >= 2 && (s.starts_with("0o") || s.starts_with("0O")) => &s[2..],
        _ => s,
    }
}

fn parse_digit_hex(c: char) -> Option<u32> {
    match c {
        '0'..='9' => Some(c as u32 - b'0' as u32),
        'a'..='f' => Some(c as u32 - 'a' as u32 + 10),
        'A'..='F' => Some(c as u32 - 'A' as u32 + 10),
        _ => None,
    }
}

/// Parse string in given base to u64. Returns error on invalid or overflow.
fn parse_to_u64(s: &str, base: BitwiseBase) -> Result<u64, String> {
    let s = strip_prefix(s, base);
    if s.is_empty() {
        return Ok(0);
    }
    let radix: u32 = match base {
        BitwiseBase::Decimal => 10,
        BitwiseBase::Hexadecimal => 16,
        BitwiseBase::Binary => 2,
        BitwiseBase::Octal => 8,
    };
    let mut value: u64 = 0;
    for c in s.chars() {
        if c.is_whitespace() || c == '_' {
            continue;
        }
        let d = match base {
            BitwiseBase::Hexadecimal => parse_digit_hex(c),
            BitwiseBase::Binary => {
                if c == '0' || c == '1' {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
            BitwiseBase::Octal => {
                if ('0'..='7').contains(&c) {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
            BitwiseBase::Decimal => {
                if c.is_ascii_digit() {
                    Some(c as u32 - b'0' as u32)
                } else {
                    None
                }
            }
        };
        let d = d.ok_or_else(|| format!("Invalid character '{}' for {:?} input", c, base))?;
        if d >= radix {
            return Err(format!("Invalid character '{}' for {:?} input", c, base));
        }
        value = value
            .checked_mul(radix as u64)
            .and_then(|v| v.checked_add(d as u64))
            .ok_or_else(|| "Value exceeds maximum".to_string())?;
    }
    Ok(value)
}

fn width_bits(w: BitwiseWidth) -> u32 {
    match w {
        BitwiseWidth::Bit8 => 8,
        BitwiseWidth::Bit16 => 16,
        BitwiseWidth::Bit32 => 32,
        BitwiseWidth::Bit64 => 64,
    }
}

fn mask_for_width(w: BitwiseWidth) -> u64 {
    match w {
        BitwiseWidth::Bit8 => 0xFF,
        BitwiseWidth::Bit16 => 0xFFFF,
        BitwiseWidth::Bit32 => 0xFFFF_FFFF,
        BitwiseWidth::Bit64 => u64::MAX,
    }
}

fn to_binary(n: u64, width: u32) -> String {
    if width == 0 {
        return String::new();
    }
    let w = width as usize;
    let s = format!("{:b}", n);
    if s.len() >= w {
        s[s.len().saturating_sub(w)..].to_string()
    } else {
        "0".repeat(w - s.len()) + &s
    }
}

fn group_binary(s: &str, group_size: usize) -> String {
    let chars: Vec<char> = s.chars().collect();
    let len = chars.len();
    let mut out = String::new();
    for (i, &c) in chars.iter().enumerate() {
        if i > 0 && (len - i).is_multiple_of(group_size) {
            out.push(' ');
        }
        out.push(c);
    }
    out
}

fn to_octal(n: u64) -> String {
    if n == 0 {
        return "0".to_string();
    }
    let mut out = Vec::new();
    let mut x = n;
    while x > 0 {
        out.push(b'0' + (x % 8) as u8);
        x /= 8;
    }
    out.reverse();
    String::from_utf8(out).unwrap()
}

fn to_hex_lower(n: u64) -> String {
    format!("{:x}", n)
}

fn format_result(value: u64, bit_width: BitwiseWidth) -> BitwiseResult {
    let w = width_bits(bit_width);
    let mask = mask_for_width(bit_width);
    let v = value & mask;
    let bin = to_binary(v, w);
    let binary_grouped = group_binary(&bin, 4);
    BitwiseResult {
        decimal: v.to_string(),
        hexadecimal: to_hex_lower(v),
        binary: bin.clone(),
        binary_grouped,
        octal: to_octal(v),
    }
}

/// Process bitwise operations.
///
/// # Example
///
/// ```
/// use instrument_core::numbers::bitwise::{
///     process, BitwiseInput, BitwiseBase, BitwiseWidth,
/// };
///
/// let out = process(BitwiseInput {
///     value_a: "60".to_string(),
///     value_b: "13".to_string(),
///     from_base: BitwiseBase::Decimal,
///     bit_width: BitwiseWidth::Bit8,
///     shift_amount: 2,
/// });
/// assert!(out.and.is_some());
/// assert_eq!(out.and.as_ref().unwrap().decimal, "12");
/// ```
pub fn process(input: BitwiseInput) -> BitwiseOutput {
    let mut out = BitwiseOutput {
        and: None,
        or: None,
        xor: None,
        nand: None,
        nor: None,
        not_a: None,
        shift_left: None,
        shift_right: None,
        rotate_left: None,
        rotate_right: None,
        bit_count_a: None,
        leading_zeros_a: None,
        trailing_zeros_a: None,
        is_power_of_two_a: None,
        error: None,
    };

    if input.value_a.trim().is_empty() {
        return out;
    }

    let width_bits = width_bits(input.bit_width);
    let mask = mask_for_width(input.bit_width);
    let shift_amount = input.shift_amount.min(width_bits.saturating_sub(1));

    let parsed_a = match parse_to_u64(&input.value_a, input.from_base) {
        Ok(v) => v & mask,
        Err(e) => {
            out.error = Some(e);
            return out;
        }
    };

    let parsed_b = if input.value_b.trim().is_empty() {
        None
    } else {
        match parse_to_u64(&input.value_b, input.from_base) {
            Ok(v) => Some(v & mask),
            Err(e) => {
                out.error = Some(e);
                return out;
            }
        }
    };

    // Bit analysis of A (use the masked value; leading/trailing within width)
    out.bit_count_a = Some(parsed_a.count_ones() as usize);
    let leading = (parsed_a << (64 - width_bits)).leading_zeros();
    out.leading_zeros_a = Some((leading.saturating_sub(64 - width_bits)) as usize);
    out.trailing_zeros_a = Some((parsed_a.trailing_zeros()).min(width_bits) as usize);
    out.is_power_of_two_a = Some(parsed_a != 0 && parsed_a.is_power_of_two());

    // Single-operand ops
    out.not_a = Some(format_result(!parsed_a & mask, input.bit_width));
    out.shift_left = Some(format_result((parsed_a << shift_amount) & mask, input.bit_width));
    out.shift_right = Some(format_result(parsed_a >> shift_amount, input.bit_width));
    out.rotate_left = Some(format_result(parsed_a.rotate_left(shift_amount) & mask, input.bit_width));
    out.rotate_right = Some(format_result(parsed_a.rotate_right(shift_amount) & mask, input.bit_width));

    if let Some(b) = parsed_b {
        out.and = Some(format_result(parsed_a & b, input.bit_width));
        out.or = Some(format_result(parsed_a | b, input.bit_width));
        out.xor = Some(format_result(parsed_a ^ b, input.bit_width));
        out.nand = Some(format_result(!(parsed_a & b) & mask, input.bit_width));
        out.nor = Some(format_result(!(parsed_a | b) & mask, input.bit_width));
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn and_operation() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "13".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        let r = out.and.unwrap();
        assert_eq!(r.decimal, "12");
        assert_eq!(r.binary, "00001100");
    }

    #[test]
    fn or_operation() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "13".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        let r = out.or.unwrap();
        assert_eq!(r.decimal, "61");
        assert_eq!(r.binary, "00111101");
    }

    #[test]
    fn xor_operation() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "13".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        let r = out.xor.unwrap();
        assert_eq!(r.decimal, "49");
        assert_eq!(r.binary, "00110001");
    }

    #[test]
    fn not_operation() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        let r = out.not_a.unwrap();
        assert_eq!(r.decimal, "195");
        assert_eq!(r.binary, "11000011");
    }

    #[test]
    fn shift_left() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 2,
        });
        let r = out.shift_left.unwrap();
        assert_eq!(r.decimal, "240");
        assert_eq!(r.binary, "11110000");
    }

    #[test]
    fn shift_right() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 2,
        });
        let r = out.shift_right.unwrap();
        assert_eq!(r.decimal, "15");
        assert_eq!(r.binary, "00001111");
    }

    #[test]
    fn popcount() {
        let out = process(BitwiseInput {
            value_a: "255".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        assert_eq!(out.bit_count_a, Some(8));
    }

    #[test]
    fn power_of_two() {
        let out = process(BitwiseInput {
            value_a: "64".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        assert_eq!(out.is_power_of_two_a, Some(true));
    }

    #[test]
    fn power_of_two_false() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        assert_eq!(out.is_power_of_two_a, Some(false));
    }

    #[test]
    fn hex_input() {
        let out = process(BitwiseInput {
            value_a: "3c".to_string(),
            value_b: "0d".to_string(),
            from_base: BitwiseBase::Hexadecimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        let r = out.and.unwrap();
        assert_eq!(r.decimal, "12");
        let r = out.or.unwrap();
        assert_eq!(r.decimal, "61");
    }

    #[test]
    fn empty_a() {
        let out = process(BitwiseInput {
            value_a: "".to_string(),
            value_b: "13".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        assert!(out.and.is_none());
        assert!(out.not_a.is_none());
        assert!(out.bit_count_a.is_none());
        assert!(out.error.is_none());
    }

    #[test]
    fn empty_b() {
        let out = process(BitwiseInput {
            value_a: "60".to_string(),
            value_b: "".to_string(),
            from_base: BitwiseBase::Decimal,
            bit_width: BitwiseWidth::Bit8,
            shift_amount: 1,
        });
        assert!(out.and.is_none());
        assert!(out.or.is_none());
        assert!(out.not_a.is_some());
        assert_eq!(out.bit_count_a, Some(4));
    }
}
