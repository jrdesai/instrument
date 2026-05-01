//! Combined Base32 / Base58 command — dispatches to the appropriate encoder.

use serde::{Deserialize, Serialize};
use specta::Type;
use ts_rs::TS;

use super::base32::{
    process as base32_process, Base32Input, Base32Mode, Base32Output, Base32Variant,
};
use super::base58::{process as base58_process, Base58Input, Base58Mode, Base58Output};

/// Which encoding to use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BaseNEncoding {
    Base32,
    Base58,
}

/// Shared mode — applies to both encodings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum BaseNMode {
    Encode,
    Decode,
}

/// Combined input for the Base32 / Base58 tool.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BaseNInput {
    pub text: String,
    pub encoding: BaseNEncoding,
    pub mode: BaseNMode,
    /// Only used when `encoding` is `Base32`.
    pub base32_variant: Base32Variant,
}

/// Combined output.
#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BaseNOutput {
    pub result: String,
    pub error: Option<String>,
}

pub fn process(input: BaseNInput) -> BaseNOutput {
    match input.encoding {
        BaseNEncoding::Base32 => {
            let out: Base32Output = base32_process(Base32Input {
                text: input.text,
                variant: input.base32_variant,
                mode: match input.mode {
                    BaseNMode::Encode => Base32Mode::Encode,
                    BaseNMode::Decode => Base32Mode::Decode,
                },
            });
            BaseNOutput {
                result: out.result,
                error: out.error,
            }
        }
        BaseNEncoding::Base58 => {
            let out: Base58Output = base58_process(Base58Input {
                text: input.text,
                mode: match input.mode {
                    BaseNMode::Encode => Base58Mode::Encode,
                    BaseNMode::Decode => Base58Mode::Decode,
                },
            });
            BaseNOutput {
                result: out.result,
                error: out.error,
            }
        }
    }
}
