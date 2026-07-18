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

function anchorHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gis)].map(match => match[2]);
}

function elementIds(html) {
  return [...html.matchAll(/\sid\s*=\s*(["'])(.*?)\1/gis)].map(match => match[2]);
}

function resolveLocalHref(file, href) {
  if (href.startsWith("//")) throw new Error(`${file}: protocol-relative links are not allowed (${href})`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const resolved = new URL(href, `https://atlas.local/${file}`);
  const pathname = decodeURIComponent(resolved.pathname.replace(/^\/+/, ""));
  return {
    target: pathname || file,
    fragment: decodeURIComponent(resolved.hash.slice(1))
  };
}

const hrefsByPage = Object.fromEntries(entries.map(([file, html]) => [file, anchorHrefs(html)]));
const idsByPage = Object.fromEntries(entries.map(([file, html]) => [file, elementIds(html)]));

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
const expectedTrackLabels = ["Atlas", "Backend", "Systems engineering", "Hardware", "Embedded", "NPU + ACiM"];

for (const [file, html] of entries) {
  if (!html.startsWith("<!DOCTYPE html>")) throw new Error(`${file}: missing canonical doctype`);
  for (const token of ['id="main"', 'class="site-header"', 'id="theme-toggle"', 'styles.css', 'app.js']) {
    if (!html.includes(token)) throw new Error(`${file}: missing shared element ${token}`);
  }
  const localTargets = new Set(hrefsByPage[file].map(href => resolveLocalHref(file, href)?.target).filter(Boolean));
  for (const target of requiredTrackLinks) {
    if (!localTargets.has(target)) throw new Error(`${file}: missing track navigation to ${target}`);
  }
  if (file !== "index.html") {
    const trackNav = html.match(/<nav\s+aria-label=["']Track navigation["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1];
    if (!trackNav) throw new Error(`${file}: missing consistently named track navigation`);
    const trackLinks = [...trackNav.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi)];
    const targets = trackLinks.map(match => match[1]);
    const labels = trackLinks.map(match => match[2].trim());
    if (JSON.stringify(targets) !== JSON.stringify(requiredTrackLinks) || JSON.stringify(labels) !== JSON.stringify(expectedTrackLabels)) {
      throw new Error(`${file}: track navigation targets, labels, or order are inconsistent`);
    }
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

  const ids = idsByPage[file];
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`${file}: duplicate IDs: ${[...new Set(duplicates)].join(", ")}`);

  for (const tag of ["section", "article", "details"]) {
    const opens = (html.match(new RegExp(`<${tag}\\b`, "g")) || []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, "g")) || []).length;
    if (opens !== closes) throw new Error(`${file}: unbalanced <${tag}> tags (${opens}/${closes})`);
  }

  for (const href of hrefsByPage[file]) {
    if (/^http:/i.test(href)) throw new Error(`${file}: external links must use HTTPS (${href})`);
    if (/^https:/i.test(href)) {
      let external;
      try {
        external = new URL(href);
      } catch {
        throw new Error(`${file}: malformed HTTPS link (${href})`);
      }
      if (external.protocol !== "https:" || !external.hostname) throw new Error(`${file}: malformed HTTPS link (${href})`);
      continue;
    }
    if (/^(?:mailto|tel):/i.test(href)) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) throw new Error(`${file}: unsafe or unsupported link scheme (${href})`);
    const local = resolveLocalHref(file, href);
    if (!local || !documents[local.target]) throw new Error(`${file}: local link target does not exist (${href})`);
    if (local.fragment && !idsByPage[local.target].includes(local.fragment)) {
      throw new Error(`${file}: link ${href} has no matching #${local.fragment} in ${local.target}`);
    }
  }
}

const pageChecks = {
  "index.html": ["tracks", "shared-core", "selector", "practice", "track-grid", "atlas-loop"],
  "backend.html": ["request", "scale", "decisions", "thinking-flow", "workbench", "practice", "bottleneck-catalog", "pattern-handbook", "Make correctness local", "failure contract"],
  "systems-engineering.html": ["context", "conops", "process", "allocation", "interfaces", "budgets", "trades", "risk", "integration", "verification", "evidence-package", "practice", "Autonomous delivery drone", "MOE", "configuration-specific proof"],
  "hardware.html": ["thinking", "metrics", "constraints", "memory", "compute", "fabric", "physical", "bottlenecks", "sizing-workbench", "practice", "Edge AI", "recovery contract"],
  "embedded.html": ["practice", "sensor", "real-time", "timing-workbench", "Hardware-in-the-loop", "task model", "transition and recovery"],
  "npu-acim.html": ["boundary", "stack", "decision", "mapping", "artifacts", "runtime", "feedback", "bottlenecks", "compiler-workbench", "practice", "Analog Compute-in-Memory", "Technology scope", "storage type, volatility/retention", "analog signal domain", "Four IR", "health generation"]
};
for (const [file, checks] of Object.entries(pageChecks)) {
  for (const check of checks) {
    if (!documents[file].toLowerCase().includes(check.toLowerCase())) throw new Error(`${file}: missing required content ${check}`);
  }
}

const requiredSources = {
  "backend.html": ["donnemartin/system-design-primer", "ashishps1/awesome-system-design-resources", "oreilly.com", "sre.google", "rfc-editor.org/rfc/rfc9110", "rfc-editor.org/rfc/rfc9111", "kafka.apache.org/43/design", "prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox", "postgresql.org/docs/current/indexes-multicolumn", "people.csail.mit.edu/karger", "research.google/pubs/the-chubby"],
  "systems-engineering.html": ["nasa.gov", "incose.org", "sebokwiki.org", "iso.org/standard/81702", "appendix-c-how-to-write-a-good-requirement", "6-5-configuration-management", "swehb.nasa.gov/spaces/SWEHBVD/pages/102695803", "nasa.gov/wp-content/uploads/2023/08/nasa-risk-mgmt-handbook"],
  "hardware.html": ["lbl.gov", "developer.arm.com", "docs.kernel.org", "riscv.org", "doi.org/10.1145/1498765.1498785", "intel.com/content/www/us/en/docs/vtune-profiler", "docs.nvidia.com/cuda/cuda-programming-guide", "gstreamer.freedesktop.org/documentation/coreelements/tee", "docs.nvidia.com/metropolis/deepstream"],
  "embedded.html": ["doi.org/10.1145/321738.321743", "doi.org/10.1093/comjnl/29.5.390", "doi.org/10.1007/BF01088593", "docs.zephyrproject.org", "freertos.org", "docs.kernel.org/core-api/dma-api-howto", "docs.mcuboot.com", "ti.com/lit/an/slva740a", "mipi_i3c-and-i3c-basic_app-note-system-integrator"],
  "npu-acim.html": ["onnx.ai/onnx/repo-docs/IR", "mlir.llvm.org/docs/DialectConversion", "iree.dev", "github.com/IBM/aihwkit", "arxiv.org/abs/2003.04293", "arxiv.org/abs/2205.10042", "github.com/sandialabs/cross-sim", "github.com/Accelergy-Project/accelergy", "github.com/mit-emze/cimloop", "doi.org/10.1109/JSSC.2022.3232601", "doi.org/10.1109/ICTA56932.2022.9963070", "doi.org/10.1109/TCSI.2021.3083275", "doi.org/10.1109/TCSII.2021.3049844"]
};
for (const [file, sources] of Object.entries(requiredSources)) {
  const normalizedTargets = hrefsByPage[file]
    .filter(href => /^https:/i.test(href))
    .map(href => {
      const url = new URL(href);
      return `${url.hostname}${url.pathname}`.toLowerCase();
    });
  for (const source of sources) {
    if (!normalizedTargets.some(target => target.includes(source.toLowerCase()))) throw new Error(`${file}: missing linked source ${source}`);
  }
}

for (const file of pages.filter(file => file !== "index.html")) {
  const externalLinks = hrefsByPage[file].filter(href => href.startsWith("https://")).length;
  if (externalLinks < 10) throw new Error(`${file}: expected at least 10 contextual/reference links, found ${externalLinks}`);
  if (!documents[file].includes('class="reference-trail"')) throw new Error(`${file}: missing contextual reference trail`);
  if (!documents[file].includes('class="detail-table-wrap"')) throw new Error(`${file}: missing detailed decision/evidence table`);
}

for (const file of pages) {
  const html = documents[file];
  const tables = [...html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)];
  for (const [index, table] of tables.entries()) {
    const label = table[1].match(/\bclass=["']([^"']+)["']/i)?.[1] || `table ${index + 1}`;
    const body = table[2];
    if (!/<caption\b/i.test(body)) throw new Error(`${file}: ${label} needs a caption`);
    if (!/<th\b[^>]*\bscope=["']col["']/i.test(body)) throw new Error(`${file}: ${label} needs scoped column headers`);
    if (!/<th\b[^>]*\bscope=["']row["']/i.test(body)) throw new Error(`${file}: ${label} needs scoped row headers`);

    const directWrapper = html.slice(0, table.index).match(/<div\b[^>]*>\s*$/i)?.[0];
    if (!directWrapper || !/\btabindex=["']0["']/i.test(directWrapper) || !/\brole=["']region["']/i.test(directWrapper) || !/\baria-label=["'][^"']+["']/i.test(directWrapper)) {
      throw new Error(`${file}: ${label} must have a directly enclosing keyboard-focusable, labelled region`);
    }
  }
}

const forbiddenClaims = {
  "backend.html": ["Ordered event history", "replicate clockwise to multiple owners", "stop work immediately when ownership is lost", "every request eventually gets a non-error response", "writes/sec × logical bytes/write × 31.5M", "index columns in the order used by filters, sorting, and joins", "(1 − availability target) × 43,200 minutes", "One business effect per payment request", "one charge per idempotency key"],
  "systems-engineering.html": ["Artifact: qualified system", "Most system failures happen between components", "No single identified failure", "Allocation + growth + margin ≤ limit", "closed requirements (pass or approved waiver/deviation)", "10 km reference mission, 2 kg payload, declared weather envelope", "80 Wh required landing reserve"],
  "hardware.html": ["L1 / local scratchpad", "L2 / shared SRAM", "HBM / DRAM", "Compute issue rate", "Deterministic I/O", "decode · resize · normalize", "while measured &lt; required", "prevent bulk traffic from blocking control", "Memory hierarchy from closest to farthest", "Edge AI computer main data flow"],
  "embedded.html": ["<b>Peripheral event</b>", "conversion and battery margin", "<span>Restore order</span>", "Independent supervisor lane", "Catches: buses, clocks, electrical/timing faults", "E_load ÷ η_conversion", "Illustrative measured WCET values"],
  "npu-acim.html": ["control + deterministic digital", "DAC → crossbar → ADC", "Tile 3<br>partial sum", "Tile/cell corrections", "Bounded idempotent retry", "when evaluation is bit-serial", "<th scope=\"col\">SRAM / charge-domain ACiM</th>", "E_region = E_nominal + Σ(E_load,wave", "warm batch-1 inference at the stated arrival rate", "Require p95 &lt; 20 ms at the 80-request/s steady mix"]
};
for (const [file, claims] of Object.entries(forbiddenClaims)) {
  for (const claim of claims) {
    if (documents[file].includes(claim)) throw new Error(`${file}: retained inaccurate or over-broad wording: ${claim}`);
  }
}

for (const selector of [":root", ".site-header", ".hero", ".section", ":focus-visible", "@media", "prefers-reduced-motion", ".track-grid", ".se-context-map", ".detail-table", ".compact-flow", ".reference-trail"]) {
  if (!css.includes(selector)) throw new Error(`styles.css: missing shared responsive selector ${selector}`);
}
if (!js.includes("theme-toggle") || !js.includes("dsa-theme")) throw new Error("app.js: theme persistence is missing");
if (!js.includes("function readTheme()") || !js.includes("function applyTheme(theme)") || !js.includes("Switch to ${targetTheme} theme") || !js.includes("try {")) {
  throw new Error("app.js: resilient and accessible theme control is incomplete");
}
const applyThemeBody = js.match(/function applyTheme\(theme\)\s*{([\s\S]*?)\n}/)?.[1] || "";
if (applyThemeBody.includes("aria-pressed")) throw new Error("app.js: theme action label must not be combined with an ambiguous pressed state");
if (!js.includes("if (answer && tradeoffs)") || !js.includes("if (signalList)")) throw new Error("app.js: page-specific widgets must be safely guarded");

for (const requiredDecisionEvidence of ["Break down p95/p99 latency by hop", "If stateless compute is limiting", "shard only when", "Start from the required SLO", "Measure latency and residency needs by region"]) {
  if (!js.includes(requiredDecisionEvidence)) throw new Error(`app.js: decision guidance lost diagnostic condition: ${requiredDecisionEvidence}`);
}
for (const prematurePrescription of ["Add cache-aside for hot reads and measure hit rate.", "Choose a stable partition key, shard data, and plan rebalancing."]) {
  if (js.includes(prematurePrescription)) throw new Error(`app.js: symptom-to-component shortcut returned: ${prematurePrescription}`);
}

const semanticContentChecks = {
  "backend.html": ["transactional outbox", "Acknowledge after durable acceptance", "Write ingress", "Live logical data", "Append-log storage", "Time-based error budget", "Request-based error budget", "non-failing node", "no finite latency bound", "provider idempotency plus uncertain-outcome reconciliation"],
  "systems-engineering.html": ["Keep two ledgers distinct", "Verification compliance", "Administrative disposition", "authorized relief—not proof of compliance", "Which quantitative fielded-system measures enable it?", "Parent safety objective—derive", "required usable-at-condition capacity is (570 + 70 + 80) ÷ (1 − 0.20) = 900 Wh", "That leaves 180 Wh"],
  "hardware.html": ["while not all_satisfied", "not one universal ladder", "QoS tag alone is not isolation", "Bounded inference queue", "Bounded recording queue", "Independent bounded processing branches"],
  "embedded.html": ["load-profile-weighted effective value", "converter quiescent loss exactly once", "observed maxima as provisional—not automatic WCET", "E_quiescent,not-yet-counted"],
  "npu-acim.html": ["Storage technology and analog signal domain are separate axes", "W × P_a = 2 × 4 = 8", "E_complete_path(p)", "80-request/s steady", "110-request/s burst", "separately for vision and audio", "steady arrival to remain below sustained thermally limited service"]
};
for (const [file, checks] of Object.entries(semanticContentChecks)) {
  for (const check of checks) {
    if (!documents[file].includes(check)) throw new Error(`${file}: missing reviewed semantic correction ${check}`);
  }
}

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
const lightFocus = cssVariable(lightTheme, "focus");
const lightSurface = cssVariable(lightTheme, "surface");
for (const [foreground, background, label] of [
  [lightOnAccent, lightBlue, "accent text"],
  [lightCyan, lightBackground, "cyan text"]
]) {
  if (!foreground || !background || contrastRatio(foreground, background) < 4.5) {
    throw new Error(`styles.css: light-theme ${label} contrast is below WCAG AA`);
  }
}
for (const [background, label] of [[lightBackground, "background"], [lightSurface, "surface"]]) {
  if (!lightFocus || !background || contrastRatio(lightFocus, background) < 3) {
    throw new Error(`styles.css: light-theme focus indicator contrast is below 3:1 on ${label}`);
  }
}
if (!css.includes("color: var(--on-accent)") || !css.includes('nav a[aria-current="page"]')) {
  throw new Error("styles.css: shared accent foreground or current-page navigation styling is missing");
}
const deploysMain = /branches:\s*(?:\["main"\]|\r?\n\s*-\s*main)/.test(workflow);
if (!workflow.includes("npm run check") || !workflow.includes("actions/deploy-pages@v4") || !deploysMain) {
  throw new Error("GitHub Pages workflow is incomplete");
}

console.log(`System Design Atlas validation passed: ${pages.length} pages, local links and fragments, interaction contracts, selected calculations, contextual source anchors, responsive CSS tokens, contrast checks, and Pages workflow.`);
