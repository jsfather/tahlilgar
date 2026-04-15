import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const sourceDir = path.join(
  repoRoot,
  "node_modules",
  "@fontsource-variable",
  "vazirmatn",
  "files",
);

const targetDir = path.join(repoRoot, "public", "fonts", "vazirmatn");

const files = [
  "vazirmatn-arabic-wght-normal.woff2",
  "vazirmatn-latin-ext-wght-normal.woff2",
  "vazirmatn-latin-wght-normal.woff2",
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyIfMissing(src, dest) {
  if (fs.existsSync(dest)) return;
  fs.copyFileSync(src, dest);
}

ensureDir(targetDir);

for (const file of files) {
  const src = path.join(sourceDir, file);
  const dest = path.join(targetDir, file);

  if (!fs.existsSync(src)) {
    console.error(`Missing font source file: ${src}`);
    process.exitCode = 1;
    continue;
  }

  copyIfMissing(src, dest);
}

