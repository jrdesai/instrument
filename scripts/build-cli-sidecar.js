#!/usr/bin/env node
import { execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

execSync("cargo build --release -p instrument-cli", {
  cwd: "src-core",
  stdio: "inherit",
});

const rustcVerbose = execSync("rustc -vV", { encoding: "utf8" });
const tripleLine = rustcVerbose
  .split("\n")
  .find((line) => line.startsWith("host:"));

if (!tripleLine) {
  throw new Error("Could not determine Rust target triple from `rustc -vV`.");
}

const triple = tripleLine.replace("host:", "").trim();
const ext = process.platform === "win32" ? ".exe" : "";
const src = join("src-core", "target", "release", `instrument${ext}`);
const destDir = join("src-tauri", "binaries");
const dest = join(destDir, `instrument-cli-${triple}${ext}`);

if (!existsSync(src)) {
  throw new Error(`CLI binary not found at ${src}`);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied CLI binary -> ${dest}`);
