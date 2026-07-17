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
  "npu-acim.html": ["boundary", "stack", "decision", "mapping", "artifacts", "runtime", "feedback", "bottlenecks", "practice", "Analog Compute-in-Memory"]
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
  "npu-acim.html": ["github.com/IBM/aihwkit", "arxiv.org/abs/2003.04293", "arxiv.org/abs/2205.10042", "github.com/sandialabs/cross-sim"]
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
if (!js.includes("if (answer && tradeoffs)") || !js.includes("if (signalList)")) throw new Error("app.js: page-specific widgets must be safely guarded");
const deploysMain = /branches:\s*(?:\["main"\]|\r?\n\s*-\s*main)/.test(workflow);
if (!workflow.includes("npm run check") || !workflow.includes("actions/deploy-pages@v4") || !deploysMain) {
  throw new Error("GitHub Pages workflow is incomplete");
}

console.log(`System Design Atlas validation passed: ${pages.length} pages, shared navigation, unique IDs, valid local anchors, sources, responsive CSS, and Pages workflow.`);
