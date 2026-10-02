// Genera los iconos PROVISIONALES de la PWA: la marca en texto ("DoC", como el wordmark
// compacto de @drinks-on-chain/ui) en Cormorant Garamond sobre papel, entre dos hilos de oro.
// Cuando exista el icono definitivo, sustituye los PNG de `public/icons` y `src/app/apple-icon.png`.
//
//   node scripts/generate-icons.mjs          (usa el Chrome instalado; en CI, el Chromium de Playwright)
//
// Los PNG generados se guardan en el repositorio: este script no corre en el build.
import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontFile = resolve(
  root,
  "node_modules/@drinks-on-chain/ui/dist/fonts/cormorant-garamond-latin-wght-normal.woff2",
);

const PAPER = "#fdfcf5";
const INK = "#15120f";
const GOLD = "#b8891f"; // trazos
const GOLD_TEXT = "#7a5915"; // oro para texto (AA sobre papel)

/** `content`: fracción del lado que ocupa la marca (los iconos "maskable" se recortan: zona segura del 80 %). */
const ICONS = [
  { file: "public/icons/icon-192.png", size: 192, content: 0.74 },
  { file: "public/icons/icon-512.png", size: 512, content: 0.74 },
  { file: "public/icons/icon-maskable-512.png", size: 512, content: 0.54 },
  { file: "src/app/apple-icon.png", size: 180, content: 0.7 },
];

function html(fontBase64, size, content) {
  const box = Math.round(size * content);
  const fontSize = Math.round(box * 0.46);
  const rule = Math.max(1, Math.round(size / 128));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: "Cormorant"; src: url(data:font/woff2;base64,${fontBase64}) format("woff2"); font-weight: 300 700; }
    html, body { margin: 0; width: ${size}px; height: ${size}px; background: ${PAPER}; }
    body { display: grid; place-items: center; }
    .seal { width: ${box}px; display: grid; justify-items: stretch; text-align: center; }
    .rule { height: ${rule}px; background: ${GOLD}; }
    .name { font: 500 ${fontSize}px/1.5 "Cormorant", serif; letter-spacing: 0.08em; padding-left: 0.08em; color: ${INK}; }
    .name em { font-style: normal; color: ${GOLD_TEXT}; }
  </style></head><body><div class="seal"><div class="rule"></div><div class="name">D<em>o</em>C</div><div class="rule"></div></div></body></html>`;
}

const fontBase64 = (await readFile(fontFile)).toString("base64");
const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
    await page.setContent(html(fontBase64, icon.size, icon.content));
    await page.evaluate(() => document.fonts.ready);
    const target = resolve(root, icon.file);
    await mkdir(dirname(target), { recursive: true });
    await page.screenshot({ path: target, type: "png" });
    await page.close();
    console.log(`${icon.file} (${icon.size}×${icon.size})`);
  }
} finally {
  await browser.close();
}
