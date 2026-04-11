import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../public/favicon-256.png");
const out = join(__dirname, "../public");

await sharp(src).resize(192, 192).toFile(join(out, "pwa-192.png"));
await sharp(src).resize(512, 512).toFile(join(out, "pwa-512.png"));

console.log("PWA icons generated: pwa-192.png, pwa-512.png");
