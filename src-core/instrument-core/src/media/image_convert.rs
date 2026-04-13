use base64::{engine::general_purpose::STANDARD, Engine};
use image::{
    codecs::jpeg::JpegEncoder,
    imageops::FilterType,
    DynamicImage, ImageFormat, ImageReader,
};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::io::Cursor;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ResizeOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub maintain_aspect: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImageConvertInput {
    pub data: String,
    pub input_format: String,
    pub output_format: String,
    pub quality: u8,
    pub resize: Option<ResizeOptions>,
    pub rotate: u32,
    pub flip: String,
    pub grayscale: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Type)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ImageConvertOutput {
    pub data: String,
    pub format: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: usize,
    pub error: Option<String>,
}

pub fn process(input: ImageConvertInput) -> ImageConvertOutput {
    match convert(input) {
        Ok(out) => out,
        Err(e) => ImageConvertOutput {
            data: String::new(),
            format: String::new(),
            width: 0,
            height: 0,
            size_bytes: 0,
            error: Some(e.to_string()),
        },
    }
}

fn convert(input: ImageConvertInput) -> Result<ImageConvertOutput, Box<dyn std::error::Error>> {
    let bytes = STANDARD.decode(&input.data)?;
    let reader = {
        let fmt = match input.input_format.to_lowercase().as_str() {
            "tga" => Some(ImageFormat::Tga),
            "png" => Some(ImageFormat::Png),
            "jpeg" | "jpg" => Some(ImageFormat::Jpeg),
            "webp" => Some(ImageFormat::WebP),
            "bmp" => Some(ImageFormat::Bmp),
            "tiff" => Some(ImageFormat::Tiff),
            "ico" => Some(ImageFormat::Ico),
            "pnm" => Some(ImageFormat::Pnm),
            _ => None,
        };
        match fmt {
            Some(f) => {
                let mut r = ImageReader::new(Cursor::new(&bytes));
                r.set_format(f);
                r
            }
            None => ImageReader::new(Cursor::new(&bytes)).with_guessed_format()?,
        }
    };
    let mut img: DynamicImage = reader.decode()?;

    if let Some(ref r) = input.resize {
        img = apply_resize(img, r);
    }

    img = match input.rotate {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => img,
    };

    img = match input.flip.as_str() {
        "horizontal" => img.fliph(),
        "vertical" => img.flipv(),
        _ => img,
    };

    if input.grayscale {
        img = img.grayscale();
    }

    let width = img.width();
    let height = img.height();
    let quality = input.quality.clamp(1, 100);
    let output_bytes = encode(&img, &input.output_format, quality)?;
    let size_bytes = output_bytes.len();
    let data = STANDARD.encode(&output_bytes);

    Ok(ImageConvertOutput {
        data,
        format: input.output_format,
        width,
        height,
        size_bytes,
        error: None,
    })
}

fn apply_resize(img: DynamicImage, opts: &ResizeOptions) -> DynamicImage {
    let orig_w = img.width();
    let orig_h = img.height();

    let (target_w, target_h) = match (opts.width, opts.height) {
        (Some(w), Some(h)) if !opts.maintain_aspect => (w, h),
        (Some(w), Some(h)) if opts.maintain_aspect => {
            let scale = (w as f64 / orig_w as f64).min(h as f64 / orig_h as f64);
            (
                (orig_w as f64 * scale).round() as u32,
                (orig_h as f64 * scale).round() as u32,
            )
        }
        (Some(w), None) => {
            let h = (orig_h as f64 * w as f64 / orig_w as f64).round() as u32;
            (w, h)
        }
        (None, Some(h)) => {
            let w = (orig_w as f64 * h as f64 / orig_h as f64).round() as u32;
            (w, h)
        }
        _ => return img,
    };

    if target_w == 0 || target_h == 0 {
        return img;
    }

    img.resize_exact(target_w, target_h, FilterType::Lanczos3)
}

fn encode(
    img: &DynamicImage,
    format: &str,
    quality: u8,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut buf = Vec::new();

    match format {
        "jpeg" | "jpg" => {
            let mut cursor = Cursor::new(&mut buf);
            let encoder = JpegEncoder::new_with_quality(&mut cursor, quality);
            img.write_with_encoder(encoder)?;
        }
        "webp" => {
            #[cfg(target_arch = "wasm32")]
            {
                // `image` WebP encoder is lossless-only and pure Rust (WASM-safe). Quality is ignored on web.
                use image::codecs::webp::WebPEncoder;
                let cursor = Cursor::new(&mut buf);
                let encoder = WebPEncoder::new_lossless(cursor);
                img.write_with_encoder(encoder)?;
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                let encoder = webp::Encoder::from_image(img)
                    .map_err(|e| format!("WebP encode: {e}"))?;
                buf = encoder.encode(quality as f32).to_vec();
            }
        }
        "png" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)?,
        "bmp" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Bmp)?,
        "tiff" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Tiff)?,
        "ico" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Ico)?,
        "tga" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Tga)?,
        "pnm" => img.write_to(&mut Cursor::new(&mut buf), ImageFormat::Pnm)?,
        _ => return Err(format!("Unsupported output format: {format}").into()),
    }

    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    fn test_png_b64() -> String {
        let img: ImageBuffer<Rgba<u8>, _> = ImageBuffer::from_pixel(4, 4, Rgba([255u8, 0, 128, 255]));
        let dyn_img = DynamicImage::ImageRgba8(img);
        let mut buf = Vec::new();
        dyn_img
            .write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)
            .expect("encode png");
        STANDARD.encode(&buf)
    }

    fn base_input() -> ImageConvertInput {
        ImageConvertInput {
            data: test_png_b64(),
            input_format: "png".into(),
            output_format: "png".into(),
            quality: 85,
            resize: None,
            rotate: 0,
            flip: String::new(),
            grayscale: false,
        }
    }

    #[test]
    fn png_to_png_roundtrip() {
        let out = process(base_input());
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.width, 4);
        assert_eq!(out.height, 4);
        assert!(!out.data.is_empty());
    }

    #[test]
    fn png_to_jpeg() {
        let input = ImageConvertInput {
            output_format: "jpeg".into(),
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.format, "jpeg");
    }

    #[test]
    fn png_to_webp() {
        let input = ImageConvertInput {
            output_format: "webp".into(),
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
    }

    #[test]
    fn png_to_bmp() {
        let input = ImageConvertInput {
            output_format: "bmp".into(),
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
    }

    #[test]
    fn resize_exact() {
        let input = ImageConvertInput {
            resize: Some(ResizeOptions {
                width: Some(2),
                height: Some(2),
                maintain_aspect: false,
            }),
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.width, 2);
        assert_eq!(out.height, 2);
    }

    #[test]
    fn rotate_90() {
        let input = ImageConvertInput {
            rotate: 90,
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
        assert_eq!(out.width, 4);
        assert_eq!(out.height, 4);
    }

    #[test]
    fn grayscale() {
        let input = ImageConvertInput {
            grayscale: true,
            ..base_input()
        };
        let out = process(input);
        assert!(out.error.is_none(), "{:?}", out.error);
        assert!(!out.data.is_empty());
    }

    /// Larger PNG so WebP quality differences dominate over container overhead.
    fn larger_png_b64() -> String {
        let img: ImageBuffer<Rgba<u8>, _> =
            ImageBuffer::from_fn(96, 96, |x, y| Rgba([(x as u8).wrapping_mul(3), (y as u8).wrapping_mul(5), 200, 255]));
        let dyn_img = DynamicImage::ImageRgba8(img);
        let mut buf = Vec::new();
        dyn_img
            .write_to(&mut Cursor::new(&mut buf), ImageFormat::Png)
            .expect("encode png");
        STANDARD.encode(&buf)
    }

    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn webp_quality_low_is_smaller_than_high() {
        let data = larger_png_b64();
        let high = process(ImageConvertInput {
            data: data.clone(),
            output_format: "webp".into(),
            quality: 90,
            ..base_input()
        });
        let low = process(ImageConvertInput {
            data,
            output_format: "webp".into(),
            quality: 10,
            ..base_input()
        });
        assert!(high.error.is_none(), "{:?}", high.error);
        assert!(low.error.is_none(), "{:?}", low.error);
        assert!(
            low.size_bytes <= high.size_bytes,
            "expected low-quality WebP ({} bytes) ≤ high-quality ({} bytes)",
            low.size_bytes,
            high.size_bytes
        );
    }
}
