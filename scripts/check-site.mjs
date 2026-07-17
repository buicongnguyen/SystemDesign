import { access, readFile } from "node:fs/promises";

const pages = [
  "index.html",
  "backend.html",
  "systems-engineering.html",
  "hardware.html",
  "embedded.html",
  "npu-acim.html"
];
const required = [...pages, "styles.css", "app.js", ".nojekyll", ".github/workflows/pages.yml"];
await Promise.all(required.map(file => access(file)));

const entries = await Promise.all(pages.map(async file => [file, await readFile(file, "utf8")]));
const documents = Object.fromEntries(entries);
const css = await readFile("styles.css", "utf8");
const js = await readFile("app.js", "utf8");
const workflow = await readFile(".github/workflows/pages.yml", "utf8");
const canonicalAssetVersion = documents["index.html"].match(/styles\.css\?v=([^"']+)/)?.[1];

function relativeLuminance(hex) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? [...value].map(character => character + character).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error(`Invalid color ${hex}`);
  const channels = normalized.match(/.{2}/g).map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function cssVariable(block, name) {
  return block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6})`, "i"))?.[1];
}

const requiredTrackLinks = ["index.html", "backend.html", "systems-engineering.html", "hardware.html", "embedded.html", "npu-acim.html"];

for (const [file, html] of entries) {
  if (!html.startsWith("<!DOCTYPE html>")) throw new Error(`${file}: missing canonical doctype`);
  for (const token of ['id="main"', 'class="site-header"', 'id="theme-toggle"', 'styles.css', 'app.js']) {
    if (!html.includes(token)) throw new Error(`${file}: missing shared element ${token}`);
  }
  for (const target of requiredTrackLinks) {
    if (!html.includes(target)) throw new Error(`${file}: missing track navigation to ${target}`);
  }
  if (/\son[a-z]+\s*=/i.test(html)) throw new Error(`${file}: inline event handlers are not allowed`);

  const styleVersion = html.match(/styles\.css\?v=([^"']+)/)?.[1];
  const scriptVersion = html.match(/app\.js\?v=([^"']+)/)?.[1];
  if (!canonicalAssetVersion || styleVersion !== canonicalAssetVersion || scriptVersion !== canonicalAssetVersion) {
    throw new Error(`${file}: shared asset cache versions are missing or inconsistent`);
  }

  const invalidGenericLabels = [...html.matchAll(/<div\b(?=[^>]*\baria-label=)(?![^>]*\brole=)[^>]*>/gi)];
  if (invalidGenericLabels.length) throw new Error(`${file}: aria-label on a generic div requires an explicit role`);

  if (html.includes('class="hero-panel"') && !/<pre\b[^>]*\btabindex="0"/i.test(html)) {
    throw new Error(`${file}: scrollable hero code needs keyboard focus`);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${file}: duplicate IDs: ${[...new Set(duplicates)].join(", ")}`);

  const localAnchors = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
  for (const anchor of localAnchors) {
    if (!ids.includes(anchor)) throw new Error(`${file}: anchor #${anchor} has no matching ID`);
  }

  for (const tag of ["section", "article", "details"]) {
    const opens = (html.match(new RegExp(`<${tag}\\b`, "g")) || []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (opens !== closes) throw new Error(`${file}: unbalanced <${tag}> tags (${opens}/${closes})`);
  }
}

const pageChecks = {
  "index.html": ["tracks", "shared-core", "selector", "practice", "track-grid", "atlas-loop"],
  "backend.html": ["request", "scale", "decisions", "thinking-flow", "practice", "bottleneck-catalog", "pattern-handbook"],
  "systems-engineering.html": ["context", "conops", "process", "allocation", "interfaces", "budgets", "trades", "risk", "integration", "verification", "practice", "Autonomous delivery drone"],
  "hardware.html": ["thinking", "metrics", "constraints", "memory", "compute", "fabric", "physical", "bottlenecks", "practice", "Edge AI"],
  "embedded.html": ["practice", "sensor", "real-time", "Hardware-in-the-loop"],
  "npu-acim.html": ["boundary", "stack", "decision", "mapping", "artifacts", "runtime", "feedback", "bottlenecks", "practice", "Analog Compute-in-Memory", "Technology scope", "SRAM or charge-domain ACiM"]
};
for (const [file, checks] of Object.entries(pageChecks)) {
  for (const check of checks) {
    if (!documents[file].toLowerCase().includes(check.toLowerCase())) throw new Error(`${file}: missing required content ${check}`);
  }
}

const requiredSources = {
  "backend.html": ["donnemartin/system-design-primer", "ashishps1/awesome-system-design-resources", "oreilly.com", "sre.google", "bytebytego.com"],
  "systems-engineering.html": ["nasa.gov", "incose.org", "sebokwiki.org"],
  "hardware.html": ["lbl.gov", "developer.arm.com", "docs.kernel.org", "riscv.org"],
  "npu-acim.html": ["github.com/IBM/aihwkit", "arxiv.org/abs/2003.04293", "arxiv.org/abs/2205.10042", "github.com/sandialabs/cross-sim", "doi.org/10.1109/JSSC.2022.3232601"]
};
for (const [file, sources] of Object.entries(requiredSources)) {
  for (const source of sources) {
    if (!documents[file].includes(source)) throw new Error(`${file}: missing source ${source}`);
  }
}

for (const selector of [":root", ".site-header", ".hero", ".section", ":focus-visible", "@media", "prefers-reduced-motion", ".track-grid", ".se-context-map"]) {
  if (!css.includes(selector)) throw new Error(`styles.css: missing shared responsive selector ${selector}`);
}
if (!js.includes("theme-toggle") || !js.includes("dsa-theme")) throw new Error("app.js: theme persistence is missing");
if (!js.includes("function readTheme()") || !js.includes("function applyTheme(theme)") || !js.includes("aria-pressed") || !js.includes("try {")) {
  throw new Error("app.js: resilient and accessible theme control is incomplete");
}
if (!js.includes("if (answer && tradeoffs)") || !js.includes("if (signalList)")) throw new Error("app.js: page-specific widgets must be safely guarded");

const scenarioIds = ["title", "prompt", "signals"];
for (const checkpoint of ["clarify", "estimate", "model", "flow", "deep", "close"]) {
  scenarioIds.push(`${checkpoint}-question`, `${checkpoint}-answer`);
}
for (const id of scenarioIds) {
  if (!documents["backend.html"].includes(`id="scenario-${id}"`)) throw new Error(`backend.html: missing dynamic scenario field scenario-${id}`);
}
if (documents["backend.html"].includes('role="tablist"') || documents["backend.html"].includes("aria-selected")) {
  throw new Error("backend.html: scenario buttons must not claim incomplete tab semantics");
}
if (!documents["backend.html"].includes('role="group"') || !documents["backend.html"].includes("aria-pressed")) {
  throw new Error("backend.html: scenario selector needs button-group semantics and state");
}

if (!js.includes("about 600 GB") || js.includes("about 60 GB")) throw new Error("app.js: URL-shortener storage estimate is incorrect");
if (!documents["systems-engineering.html"].includes("<td>3.75</td>") || !documents["systems-engineering.html"].includes("<strong>3.95</strong>")) {
  throw new Error("systems-engineering.html: weighted trade-study totals are incorrect");
}
if (!documents["embedded.html"].includes("44.4 mWh/day") || documents["embedded.html"].includes("Wh-millihours")) {
  throw new Error("embedded.html: daily energy calculation or units are incorrect");
}
if (!documents["index.html"].includes("7</strong><span>interview prompts") || !documents["index.html"].includes("45–55 minute")) {
  throw new Error("index.html: practice counts or duration are stale");
}

const lightTheme = css.match(/:root\[data-theme="light"\]\s*{([^}]*)}/s)?.[1];
if (!lightTheme) throw new Error("styles.css: light theme variables are missing");
const lightBackground = cssVariable(lightTheme, "bg");
const lightBlue = cssVariable(lightTheme, "blue");
const lightCyan = cssVariable(lightTheme, "cyan");
const lightOnAccent = cssVariable(lightTheme, "on-accent");
for (const [foreground, background, label] of [
  [lightOnAccent, lightBlue, "accent text"],
  [lightCyan, lightBackground, "cyan text"]
]) {
  if (!foreground || !background || contrastRatio(foreground, background) < 4.5) {
    throw new Error(`styles.css: light-theme ${label} contrast is below WCAG AA`);
  }
}
if (!css.includes("color: var(--on-accent)") || !css.includes('nav a[aria-current="page"]')) {
  throw new Error("styles.css: shared accent foreground or current-page navigation styling is missing");
}
const deploysMain = /branches:\s*(?:\["main"\]|\r?\n\s*-\s*main)/.test(workflow);
if (!workflow.includes("npm run check") || !workflow.includes("actions/deploy-pages@v4") || !deploysMain) {
  throw new Error("GitHub Pages workflow is incomplete");
}

console.log(`System Design Atlas validation passed: ${pages.length} pages, interactions, calculations, accessibility contracts, sources, responsive CSS, contrast, and Pages workflow.`);
