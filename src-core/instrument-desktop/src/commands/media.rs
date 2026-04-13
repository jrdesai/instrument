use std::time::Instant;

use instrument_core::media::image_convert::{
    process as image_convert_core, ImageConvertInput, ImageConvertOutput,
};

use crate::command_log::finish_ok;

/// Converts image bytes between formats with optional transforms.
#[tauri::command]
#[specta::specta]
pub fn image_convert(input: ImageConvertInput) -> ImageConvertOutput {
    let start = Instant::now();
    let output = image_convert_core(input);
    finish_ok("image_convert", start);
    output
}
