// Generates the app's icons from the wordmark's "t" on the brand gradient.
//
//   node scripts/generate-icons.mjs
//
// Renders with headless Google Chrome (no image tools needed) into
// src/shared/assets/images, and copies the iOS icon into the Xcode project.
// Colours come from src/shared/utils/brand-colors.ts: Turnupz blue into deep blue.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "src/shared/assets/images");
const IOS_ICON = join(ROOT, "ios/Turnup/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const BLUE = "#00B2FF";
const BLUE_DEEP = "#0577FA";

const logo = readFileSync(join(ROOT, "src/shared/components/brand-intro/logo-paths.ts"), "utf8");
const d = [...logo.matchAll(/"(M[^"]+)"/g)].map((m) => m[1])[0];

// The "t": the wordmark clipped where it joins the "u", with a slanted cut.
const CLIP = `<clipPath id="t"><polygon points="0,0 15.3,0 12.3,20 10.6,30 10.6,43 0,43"/></clipPath>`;
const BOX = { x: 3.1, y: 0, w: 9.3, h: 30.2 }; // the t's bounds in wordmark units

const glyph = (size, height, color, dx = 0) => {
  const k = height / BOX.h;
  const tx = size / 2 - (BOX.x + BOX.w / 2) * k + dx;
  const ty = size / 2 - (BOX.y + BOX.h / 2) * k;
  return `<g transform="translate(${tx} ${ty}) scale(${k})"><path d="${d}" fill="${color}" clip-path="url(#t)"/></g>`;
};
// Light at the bottom left into deep at the top right.
const gradient = (x0, y0, x1, y1) =>
  `<linearGradient id="g" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${BLUE_DEEP}"/></linearGradient>`;
const svg = (size, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>${CLIP}${defs}</defs>${body}</svg>`;

// name: [size, svg, transparent background?]
const ASSETS = {
  // iOS and store icon: full-bleed gradient (the OS rounds the corners).
  "icon.png": [1024, svg(1024, `<rect width="1024" height="1024" fill="url(#g)"/>${glyph(1024, 640, "#fff", 12)}`, gradient(0, 1024, 1024, 0)), false],
  // Android adaptive icon: gradient layer behind, the t in the safe zone in front.
  "adaptive-background.png": [1024, svg(1024, `<rect width="1024" height="1024" fill="url(#g)"/>`, gradient(0, 1024, 1024, 0)), false],
  "adaptive-icon.png": [1024, svg(1024, glyph(1024, 430, "#fff", 8)), true],
  // Android 13 themed icon: one colour, tinted by the system.
  "monochrome-icon.png": [1024, svg(1024, glyph(1024, 430, "#000", 8)), true],
  // The rounded brand tile.
  "splash-icon.png": [1024, svg(1024, `<rect x="112" y="112" width="800" height="800" rx="180" fill="url(#g)"/>${glyph(1024, 500, "#fff", 9)}`, gradient(112, 912, 912, 112)), true],
  "favicon.png": [48, svg(48, `<rect width="48" height="48" rx="10" fill="url(#g)"/>${glyph(48, 32, "#fff", 0.6)}`, gradient(0, 48, 48, 0)), true]
};

const profile = mkdtempSync(join(tmpdir(), "turnupz-icons-"));
const port = 9640;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 80 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(250); }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = {};
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
for (const [name, [size, markup, transparent]] of Object.entries(ASSETS)) {
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  const html = `<html><body style="margin:0;background:transparent">${markup}</body></html>`;
  await send("Page.navigate", { url: "data:text/html;base64," + Buffer.from(html).toString("base64") });
  await sleep(600);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 } });
  writeFileSync(join(OUT, name), Buffer.from(shot.result.data, "base64"));
  console.log("wrote", name);
}
ws.close();
chrome.kill();

if (existsSync(IOS_ICON)) {
  copyFileSync(join(OUT, "icon.png"), IOS_ICON);
  console.log("copied icon.png into the iOS project");
}
