import { access, lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { assertReviewedCalculations } from "./reviewed-calculations.mjs";
import { pages, publicFiles } from "./site-files.mjs";

const required = [
  ...publicFiles,
  "README.md",
  "package.json",
  "package-lock.json",
  ".htmlvalidate.json",
  "playwright.config.mjs",
  "tests/site.spec.mjs",
  "tests/logic.spec.mjs",
  "scripts/build-site.mjs",
  "scripts/check-external-links.mjs",
  "scripts/external-link-core.mjs",
  "scripts/path-safety.mjs",
  "scripts/reviewed-calculations.mjs",
  "scripts/serve.mjs",
  ".github/workflows/pages.yml",
  ".github/workflows/external-links.yml",
  ".github/dependabot.yml"
];
await Promise.all(required.map(file => access(file)));

const entries = await Promise.all(pages.map(async file => [file, await readFile(file, "utf8")]));
const documents = Object.fromEntries(entries);
const css = await readFile("styles.css", "utf8");
const js = await readFile("app.js", "utf8");
const backendJs = await readFile("backend.js", "utf8");
const serveSource = await readFile("scripts/serve.mjs", "utf8");
const buildSource = await readFile("scripts/build-site.mjs", "utf8");
const linkCheckSource = await readFile("scripts/check-external-links.mjs", "utf8");
const externalLinkCoreSource = await readFile("scripts/external-link-core.mjs", "utf8");
const pathSafetySource = await readFile("scripts/path-safety.mjs", "utf8");
const browserTestSource = await readFile("tests/site.spec.mjs", "utf8");
const logicTestSource = await readFile("tests/logic.spec.mjs", "utf8");
const workflow = await readFile(".github/workflows/pages.yml", "utf8");
const externalLinkWorkflow = await readFile(".github/workflows/external-links.yml", "utf8");
const readme = await readFile("README.md", "utf8");
const socialCard = await readFile("assets/social-card.png");
const packageData = JSON.parse(await readFile("package.json", "utf8"));
const canonicalAssetVersion = documents["index.html"].match(/styles\.css\?v=([^"']+)/)?.[1];

async function artifactFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Artifact must not contain symbolic links (${name})`);
    if (entry.isDirectory()) files.push(...await artifactFiles(path, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Artifact contains an unsupported filesystem entry (${name})`);
  }
  return files;
}

async function validateArtifact(directory) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${directory}: artifact path must be a real directory`);

  const actual = (await artifactFiles(directory)).sort();
  const expected = [...publicFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter(file => !actual.includes(file));
    const unexpected = actual.filter(file => !expected.includes(file));
    throw new Error(`${directory}: artifact allowlist mismatch (missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"})`);
  }

  for (const file of publicFiles) {
    const [source, packaged] = await Promise.all([readFile(file), readFile(resolve(directory, file))]);
    if (!source.equals(packaged)) throw new Error(`${directory}: packaged ${file} differs from its source`);
  }
}

const artifactFlag = process.argv.slice(2);
if (artifactFlag.length && (artifactFlag.length !== 2 || artifactFlag[0] !== "--artifact")) {
  throw new Error("Usage: node scripts/check-site.mjs [--artifact DIRECTORY]");
}
if (artifactFlag.length) await validateArtifact(resolve(artifactFlag[1]));

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
const trackStyles = {
  "hardware.html": "hardware.css",
  "embedded.html": "embedded.css",
  "npu-acim.html": "npu-acim.css"
};

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!socialCard.subarray(0, 8).equals(pngSignature) || socialCard.readUInt32BE(16) !== 1200 || socialCard.readUInt32BE(20) !== 630) {
  throw new Error("assets/social-card.png must be a valid 1200 × 630 PNG");
}

for (const [file, html] of entries) {
  if (!html.startsWith("<!DOCTYPE html>")) throw new Error(`${file}: missing canonical doctype`);
  for (const token of ['id="main"', 'class="site-header"', 'id="theme-toggle"', 'styles.css', 'app.js']) {
    if (!html.includes(token)) throw new Error(`${file}: missing shared element ${token}`);
  }
  for (const token of [
    'property="og:image" content="https://buicongnguyen.github.io/SystemDesign/assets/social-card.png"',
    'property="og:image:type" content="image/png"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'property="og:image:alt"',
    'name="twitter:image" content="https://buicongnguyen.github.io/SystemDesign/assets/social-card.png"',
    'name="twitter:image:alt"'
  ]) {
    if (!html.includes(token)) throw new Error(`${file}: social-preview metadata is missing ${token}`);
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
  if (/<style\b/i.test(html)) throw new Error(`${file}: page-specific CSS must live in a deployable stylesheet`);

  const trackStyle = trackStyles[file];
  if (trackStyle && !html.includes(`href="${trackStyle}?v=${canonicalAssetVersion}"`)) {
    throw new Error(`${file}: missing versioned track stylesheet ${trackStyle}`);
  }

  for (const attribute of html.matchAll(/\s([^\s"'<>\/=]+)\s*=\s*(["'])(.*?)\2/gis)) {
    const [, name, , value] = attribute;
    if (/&(?!(?:[a-z][a-z0-9]+|#\d+|#x[\da-f]+);)/i.test(value)) {
      throw new Error(`${file}: raw ampersand in ${name} attribute; encode it as &amp;`);
    }
  }

  const requiredVersionedAssets = [
    "theme-init.js",
    "styles.css",
    "app.js",
    ...(file === "backend.html" ? ["backend.js"] : []),
    ...(trackStyle ? [trackStyle] : [])
  ];
  for (const asset of requiredVersionedAssets) {
    const escapedAsset = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const version = html.match(new RegExp(`(?:src|href)=["']${escapedAsset}\\?v=([^"']+)["']`, "i"))?.[1];
    if (!canonicalAssetVersion || version !== canonicalAssetVersion) {
      throw new Error(`${file}: ${asset} cache version is missing or inconsistent`);
    }
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
  "systems-engineering.html": ["nasa.gov", "incose.org", "sebokwiki.org", "iso.org/standard/81702", "appendix-c-how-to-write-a-good-requirement", "6-5-configuration-management", "ntrs.nasa.gov/api/citations/20170007239", "nodis3.gsfc.nasa.gov/displaydir.cfm", "nasa.gov/wp-content/uploads/2023/08/nasa-risk-mgmt-handbook"],
  "hardware.html": ["lbl.gov", "developer.arm.com", "docs.kernel.org", "riscv.org", "doi.org/10.1145/1498765.1498785", "intel.com/content/www/us/en/docs/vtune-profiler", "docs.nvidia.com/cuda/cuda-programming-guide", "gstreamer.freedesktop.org/documentation/coreelements/tee", "docs.nvidia.com/metropolis/deepstream"],
  "embedded.html": ["doi.org/10.1145/321738.321743", "doi.org/10.1093/comjnl/29.5.390", "link.springer.com/article/10.1007/BF01088593", "docs.zephyrproject.org", "freertos.org", "docs.kernel.org/core-api/dma-api-howto", "docs.mcuboot.com", "ti.com/lit/an/slva740a", "mipi_i3c-and-i3c-basic_app-note-system-integrator"],
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
  "backend.html": ["Ordered event history", "replicate clockwise to multiple owners", "stop work immediately when ownership is lost", "every request eventually gets a non-error response", "writes/sec × logical bytes/write × 31.5M", "index columns in the order used by filters, sorting, and joins", "(1 − availability target) × 43,200 minutes", "One business effect per payment request", "one charge per idempotency key", "Alex Xu’s framework uses four repeatable passes"],
  "systems-engineering.html": ["Artifact: qualified system", "Most system failures happen between components", "No single identified failure", "Allocation + growth + margin ≤ limit", "closed requirements (pass or approved waiver/deviation)", "10 km reference mission, 2 kg payload, declared weather envelope", "80 Wh required landing reserve", "Door-to-door medical delivery", "10 km round trip", "resource limit − current best estimate", "<b>Absolute margin</b><code>resource limit − predicted value</code>", "SYS-RELEASE-024", "NASA02_NPR_7123_1D.pdf"],
  "hardware.html": ["L1 / local scratchpad", "L2 / shared SRAM", "HBM / DRAM", "Compute issue rate", "Deterministic I/O", "decode · resize · normalize", "while measured &lt; required", "prevent bulk traffic from blocking control", "Memory hierarchy from closest to farthest", "Edge AI computer main data flow", "<b>Sensor payload</b>", "drop/backpressure rules keep", "start near 7.2 peak TOPS", "advance the logical generation"],
  "embedded.html": ["<b>Peripheral event</b>", "conversion and battery margin", "<span>Restore order</span>", "Independent supervisor lane", "Catches: buses, clocks, electrical/timing faults", "E_load ÷ η_conversion", "Illustrative measured WCET values", "<span>Dynamic deadlines</span>"],
  "npu-acim.html": ["control + deterministic digital", "DAC → crossbar → ADC", "Tile 3<br>partial sum", "Tile/cell corrections", "Bounded idempotent retry", "when evaluation is bit-serial", "<th scope=\"col\">SRAM / charge-domain ACiM</th>", "E_region = E_nominal + Σ(E_load,wave", "warm batch-1 inference at the stated arrival rate", "Require p95 &lt; 20 ms at the 80-request/s steady mix", "data-matrix-rows=", "fences new pins, waits for the old residency reference count to reach zero, acquires", "stop/drain, revoke descriptors"]
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
if (!js.includes("function storedTheme()") || !js.includes("function preferredTheme()") || !js.includes("function applyTheme(theme)") || !js.includes("Switch to ${targetTheme} theme") || !js.includes("try {")) {
  throw new Error("app.js: resilient and accessible theme control is incomplete");
}
const applyThemeBody = js.match(/function applyTheme\(theme\)\s*{([\s\S]*?)\n}/)?.[1] || "";
if (applyThemeBody.includes("aria-pressed")) throw new Error("app.js: theme action label must not be combined with an ambiguous pressed state");
if (!backendJs.includes("if (answer && tradeoffs)") || !backendJs.includes("if (signalList)")) throw new Error("backend.js: page-specific widgets must be safely guarded");

for (const requiredDecisionEvidence of ["Break down p95/p99 latency by hop", "If stateless compute is limiting", "shard only when", "Start from the required SLO", "Measure latency and residency needs by region"]) {
  if (!backendJs.includes(requiredDecisionEvidence)) throw new Error(`backend.js: decision guidance lost diagnostic condition: ${requiredDecisionEvidence}`);
}
for (const prematurePrescription of ["Add cache-aside for hot reads and measure hit rate.", "Choose a stable partition key, shard data, and plan rebalancing."]) {
  if (backendJs.includes(prematurePrescription)) throw new Error(`backend.js: symptom-to-component shortcut returned: ${prematurePrescription}`);
}
for (const correctedScenarioContract of ["read/write ratio alone does not justify caching", "use a cache only after measured hot-key reuse", "conditional insert protected by the authoritative store’s unique constraint", "server_sequence", "clients must not choose the authoritative sequence"]) {
  if (!backendJs.includes(correctedScenarioContract)) throw new Error(`backend.js: scenario logic lost reviewed contract: ${correctedScenarioContract}`);
}
for (const staleScenarioClaim of ["The read-heavy ratio strongly favors caching", "random Base62 with a uniqueness check", "sender_id, sequence, client_idempotency_key"]) {
  if (backendJs.includes(staleScenarioClaim)) throw new Error(`backend.js: stale scenario claim returned: ${staleScenarioClaim}`);
}

const semanticContentChecks = {
  "backend.html": ["transactional outbox", "Acknowledge after durable acceptance", "Write ingress", "Live logical data", "Append-log storage", "Time-based error budget", "Request-based error budget", "non-failing node", "no finite latency bound", "provider idempotency plus uncertain-outcome reconciliation", "Atomically claim stock", "This Atlas loop adapts"],
  "systems-engineering.html": ["Keep two ledgers distinct", "Power + energy", "Never add unlike units", "Upper-bound margin", "Lower-bound margin", "Verification compliance", "Administrative disposition", "authorized relief—not proof of compliance", "Which quantitative fielded-system measures enable it?", "Parent safety objective—derive", "20% acceptance lower bound", "one-sided acceptance guard band", "C<sub>u</sub> ≥ 720 ÷ (1 − 0.22) = 923.1 Wh", "subtracting the 2-point tolerance leaves the required 20% lower bound", "E<sub>remaining,ref</sub>", "REF-MISSION-01", "SYS-LAND-024", "Evaluate the entry condition once at declaration", "CMP-ENV-022", "ALLOC-LAT-023", "HMI-OPS-032", "SYS-OPS-033"],
  "hardware.html": ["while not all_satisfied", "not one universal ladder", "QoS tag alone is not isolation", "Bounded inference queue", "Bounded recording queue", "Independent bounded processing branches", "Post-ISP surface rate", "backpressure is not isolation", "arithmetic minimum implied by that measurement", "advance the request/completion epoch"],
  "embedded.html": ["load-profile-weighted effective value", "converter quiescent loss exactly once", "observed maxima as provisional—not automatic WCET", "E_quiescent,not-yet-counted", "Job-level absolute deadlines", "fixed-priority iteration gives response times"],
  "npu-acim.html": ["Storage technology and analog signal domain are separate axes", "W × P_a = 2 × 4 = 8", "K = 768, M = 384 → N_K = 3, N_M = 6", "E_complete_path(p)", "80-request/s steady", "110-request/s burst", "B₀ = 0", "B_end = max(0, B₀ + (λ_burst − μ)T)", "separately for vision and audio", "steady arrival to remain below sustained thermally limited service", "device_uid_match", "Four-context residency protocol", "atomically claims the lease", "Keep DMA-accessible memory and residency references pinned"]
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

assertReviewedCalculations(documents, backendJs);
if (documents["embedded.html"].includes("Wh-millihours")) throw new Error("embedded.html: invalid energy unit returned");
if (!documents["index.html"].includes("7</strong><span>interview prompts") || !documents["index.html"].includes("45–55 minute")) {
  throw new Error("index.html: practice counts or duration are stale");
}
const pageReferenceAuditDate = documents["index.html"].match(/Reference rule · audited (\d{4}-\d{2}-\d{2})/)?.[1];
const readmeReferenceAuditDate = readme.match(/Reference availability was reviewed on (\d{4}-\d{2}-\d{2})/)?.[1];
if (!pageReferenceAuditDate || pageReferenceAuditDate !== readmeReferenceAuditDate) {
  throw new Error("Reference-audit provenance date must match in index.html and README.md");
}
if (!documents["systems-engineering.html"].includes("13</strong><span>connected views")) {
  throw new Error("systems-engineering.html: connected-view count is stale");
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
if (!css.includes("--site-header-height") || !css.includes("top: var(--site-header-height)") || !js.includes("ResizeObserver") || !js.includes('window.addEventListener("resize", scheduleLayoutSync')) {
  throw new Error("Shared navigation: sticky offset or resize-aware current-track reveal is incomplete");
}
if (!js.includes("linkCenterInContent") || js.includes("current.offsetLeft")) {
  throw new Error("Shared navigation: current-track centering must use the scroller's coordinate space");
}

for (const token of ["publicFiles", "allowedHost", 'request.method !== "GET"', "isSymbolicLink()", "X-Content-Type-Options"]) {
  if (!serveSource.includes(token)) throw new Error(`scripts/serve.mjs: public-preview boundary is missing ${token}`);
}
for (const token of ["fileURLToPath(import.meta.url)", "resolveContainedPath", "assertNotSymbolicLink", "assertRegularNonSymlinkFile", "realpath(sourceCandidate)", "assertInside(root, source"]) {
  if (!buildSource.includes(token)) throw new Error(`scripts/build-site.mjs: tested source/destination containment is missing ${token}`);
}
for (const token of ["assertInside", "resolveContainedPath", "assertNotSymbolicLink", "assertRegularNonSymlinkFile"]) {
  if (!pathSafetySource.includes(token)) throw new Error(`scripts/path-safety.mjs: path boundary is missing ${token}`);
}
for (const token of ["transientStatuses", "transientNetworkCodes", 'result: transient ? "inconclusive" : "failed"', "persistent HTTP or network failure", "requestExternalLink", "maximumRedirects"]) {
  if (!linkCheckSource.includes(token)) throw new Error(`scripts/check-external-links.mjs: failure classification or hardened request integration is missing ${token}`);
}
for (const token of ["httpsRequest", "agent: false", "createPinnedLookup", "assertPublicHttps", "AbortSignal.timeout", "maximumRedirects", "privateAddress"]) {
  if (!externalLinkCoreSource.includes(token)) throw new Error(`scripts/external-link-core.mjs: pinned redirect boundary is missing ${token}`);
}
for (const token of ["reject HTTPS downgrade", "newly resolved private destination", "redirect count is bounded", "one deadline covers", "freshly resolved", "refuses another hostname", "path containment rejects", "path guards reject symbolic links"]) {
  if (!logicTestSource.includes(token)) throw new Error(`tests/logic.spec.mjs: behavioral security regression is missing ${token}`);
}
for (const token of ["port: 0", "reducedMotion", "width: 320", "linkRect.left >= navRect.left", "centerError", 'behavior: "instant"', "Math.abs(topics.getBoundingClientRect().top - header.getBoundingClientRect().bottom) <= 1", "/package.json", 'Host: \"untrusted.example\"']) {
  if (!browserTestSource.includes(token)) throw new Error(`tests/site.spec.mjs: responsive or preview-boundary regression is missing ${token}`);
}

const deploysMain = /branches:\s*(?:\["main"\]|\r?\n\s*-\s*main)/.test(workflow);
if (!workflow.includes("npm run check") || !workflow.includes("actions/deploy-pages@") || !workflow.match(/path:\s*_site\b/) || !deploysMain) {
  throw new Error("GitHub Pages workflow is incomplete");
}
const validationJob = workflow.match(/\n  validate:\s*\n([\s\S]*?)(?=\n  [a-z][\w-]*:\s*\n)/)?.[1] || "";
const packageJob = workflow.match(/\n  package:\s*\n([\s\S]*?)(?=\n  [a-z][\w-]*:\s*\n)/)?.[1] || "";
const deployJob = workflow.match(/\n  deploy:\s*\n([\s\S]*?)$/)?.[1] || "";
if (!validationJob.includes("contents: read") || /pages:\s*write/.test(validationJob)) {
  throw new Error("GitHub Pages PR validation must run with read-only repository permissions");
}
if (!packageJob.includes("github.ref == 'refs/heads/main'") || !packageJob.includes("github.event_name != 'pull_request'") || !packageJob.includes("pages: write")) {
  throw new Error("GitHub Pages packaging authority must be isolated from pull-request validation");
}
const hasBoundedTimeout = job => /timeout-minutes:\s*(?:[1-9]|[1-5]\d|60)\b/.test(job);
if (![validationJob, packageJob, deployJob].every(hasBoundedTimeout)) {
  throw new Error("Every GitHub Pages job must have an explicit timeout of at most 60 minutes");
}
if (!externalLinkWorkflow.includes("schedule:") || !externalLinkWorkflow.includes("npm run check:links")) {
  throw new Error("Scheduled external-link workflow is incomplete");
}
for (const action of `${workflow}\n${externalLinkWorkflow}`.matchAll(/uses:\s*([^\s@]+)@([^\s#]+)/g)) {
  if (!/^[0-9a-f]{40}$/.test(action[2])) throw new Error(`GitHub Action ${action[1]} must be pinned to a full commit SHA`);
}

const scripts = packageData.scripts || {};
for (const entry of ["node --check theme-init.js", "node --check app.js", "node --check backend.js"]) {
  if (!scripts["check:syntax"]?.includes(entry)) throw new Error(`package.json: check:syntax is missing ${entry}`);
}
for (const entry of ["tests/logic.spec.mjs", "scripts/external-link-core.mjs", "scripts/path-safety.mjs"]) {
  if (!scripts["check:syntax"]?.includes(entry)) throw new Error(`package.json: check:syntax is missing ${entry}`);
}
if (!scripts.build?.includes("scripts/build-site.mjs") || !scripts.check?.includes("--artifact _site")) {
  throw new Error("package.json: build or packaged-artifact validation contract is incomplete");
}
if (scripts["test:logic"] !== "node --test tests/logic.spec.mjs" || !scripts.check?.includes("npm run test:logic")) {
  throw new Error("package.json: deterministic logic/security regression suite is not part of npm run check");
}
if (scripts["check:html"] !== 'html-validate "*.html"' || !scripts.check?.includes("npm run check:html") || !packageData.devDependencies?.["html-validate"]) {
  throw new Error("package.json: offline HTML-structure validation is incomplete");
}
if (scripts["test:ui"] !== "playwright test" || !workflow.includes("npm ci") || !workflow.includes("playwright install --with-deps chromium") || !workflow.includes("npm run test:ui")) {
  throw new Error("GitHub Pages workflow is missing the browser smoke-test contract");
}

console.log(`System Design Atlas validation passed: ${pages.length} pages, local links and fragments, interaction contracts, selected calculations, contextual source anchors, responsive CSS tokens, contrast checks, packaged-artifact allowlist, and pinned Pages workflows.`);
