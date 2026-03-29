/**
 * One-off generator for public/og-image.png (1200×630). Run: pnpm exec node scripts/generate-og-image.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const W = 1200;
const H = 630;

const iconBuf = readFileSync(join(root, "src-tauri/icons/icon.png"));
const iconPng = await sharp(iconBuf).resize(120, 120).png().toBuffer();
const iconB64 = iconPng.toString("base64");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#0f1117"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <image href="data:image/png;base64,${iconB64}" x="${W / 2 - 60}" y="${H / 2 - 130}" width="120" height="120"/>
  <text x="${W / 2}" y="${H / 2 + 30}" text-anchor="middle" fill="#f8fafc" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="64" font-weight="bold">Instrument</text>
  <text x="${W / 2}" y="${H / 2 + 80}" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="28">Privacy-first developer toolkit</text>
  <text x="${W / 2}" y="${H / 2 + 120}" text-anchor="middle" fill="#475569" font-family="system-ui, -apple-system, sans-serif" font-size="22">All computation runs locally — nothing leaves your browser</text>
</svg>`;

const outPath = join(root, "public/og-image.png");
await sharp(Buffer.from(svg)).png().toFile(outPath);
console.log("✓", outPath, "written");
