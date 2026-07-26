import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "assets");

const cards = [
  {
    file: "social-atlas.png",
    label: "ATLAS · FIVE INTERVIEW TRACKS",
    title: ["Choose the boundary.", "Then choose the method."],
    subtitle: "Visual reasoning, bottlenecks, trade-offs, and interview practice.",
    accent: "#68a7ff",
    accent2: "#b69cff",
    tags: ["BACKEND", "SYSTEMS", "HARDWARE · EMBEDDED · ACiM"],
    motif: "atlas"
  },
  {
    file: "social-backend.png",
    label: "BACKEND SYSTEM DESIGN",
    title: ["Design for load.", "Make correctness local."],
    subtitle: "APIs, data, caching, queues, resilience, and measurable SLOs.",
    accent: "#68a7ff",
    accent2: "#63d5ed",
    tags: ["FLOW", "BOTTLENECK", "TRADE-OFF"],
    motif: "backend"
  },
  {
    file: "social-systems.png",
    label: "SYSTEMS ENGINEERING",
    title: ["Trace the mission.", "Build the evidence."],
    subtitle: "Needs, requirements, interfaces, risk, integration, and V&V.",
    accent: "#69d6b1",
    accent2: "#63d5ed",
    tags: ["CONOPS", "ARCHITECTURE", "EVIDENCE"],
    motif: "systems"
  },
  {
    file: "social-hardware.png",
    label: "HARDWARE + COMPUTER SYSTEMS",
    title: ["Count the bytes.", "Meet the physical budget."],
    subtitle: "Compute, memory, fabric, power, thermal limits, and reliability.",
    accent: "#f3b451",
    accent2: "#69d6b1",
    tags: ["WORKLOAD", "ROOFLINE", "PPA · RAS"],
    motif: "hardware"
  },
  {
    file: "social-embedded.png",
    label: "EMBEDDED + CYBER-PHYSICAL",
    title: ["Observe the world.", "Act before the deadline."],
    subtitle: "Control loops, scheduling, DMA, power modes, safety, and HIL.",
    accent: "#63d5ed",
    accent2: "#69d6b1",
    tags: ["SENSE", "DECIDE", "ACT · VERIFY"],
    motif: "embedded"
  },
  {
    file: "social-npu-acim.png",
    label: "NPU + ANALOG COMPUTE-IN-MEMORY",
    title: ["Compile the model.", "Close the silicon loop."],
    subtitle: "Partition, map, calibrate, execute, observe, and adapt.",
    accent: "#b69cff",
    accent2: "#63d5ed",
    tags: ["COMPILER", "RUNTIME", "DEVICE FEEDBACK"],
    motif: "npu"
  }
];

function motifMarkup(type, accent, accent2) {
  const common = `fill="#10233b" stroke="${accent}" stroke-width="2"`;
  if (type === "backend") {
    return `
      <g transform="translate(874 180) scale(.78)">
        <rect x="0" y="30" width="92" height="58" rx="14" ${common}/><text x="46" y="66" text-anchor="middle">API</text>
        <path d="M92 59H132" stroke="${accent2}" stroke-width="4"/>
        <rect x="132" y="0" width="120" height="58" rx="14" ${common}/><text x="192" y="36" text-anchor="middle">CACHE</text>
        <rect x="132" y="78" width="120" height="58" rx="14" ${common}/><text x="192" y="114" text-anchor="middle">QUEUE</text>
        <path d="M252 29H282V168" fill="none" stroke="${accent2}" stroke-width="4"/>
        <path d="M252 107H282" stroke="${accent2}" stroke-width="4"/>
        <rect x="282" y="138" width="96" height="72" rx="14" ${common}/><text x="330" y="181" text-anchor="middle">DATA</text>
        <path d="M330 210V248" stroke="${accent2}" stroke-width="4"/>
        <rect x="260" y="248" width="140" height="58" rx="29" ${common}/><text x="330" y="284" text-anchor="middle">EVIDENCE</text>
      </g>`;
  }
  if (type === "systems") {
    return `
      <g transform="translate(875 165) scale(.84)">
        <path d="M20 20L190 300L360 20" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
        <g ${common}><rect x="0" y="0" width="112" height="52" rx="12"/><rect x="248" y="0" width="112" height="52" rx="12"/>
        <rect x="63" y="93" width="112" height="52" rx="12"/><rect x="185" y="93" width="112" height="52" rx="12"/>
        <rect x="126" y="228" width="128" height="58" rx="12"/></g>
        <text x="56" y="33" text-anchor="middle">NEED</text><text x="304" y="33" text-anchor="middle">VALIDATE</text>
        <text x="119" y="126" text-anchor="middle">REQUIRE</text><text x="241" y="126" text-anchor="middle">VERIFY</text>
        <text x="190" y="263" text-anchor="middle">INTEGRATE</text>
      </g>`;
  }
  if (type === "hardware") {
    return `
      <g transform="translate(887 170) scale(.77)">
        <path d="M20 300V20M20 300H360" stroke="#9fb0c5" stroke-width="3"/>
        <path d="M48 270L198 90H342" fill="none" stroke="${accent}" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="118" cy="220" r="12" fill="${accent2}"/><circle cx="264" cy="118" r="12" fill="${accent2}"/>
        <text x="98" y="254">BYTE-BOUND</text><text x="228" y="72">COMPUTE ROOF</text>
        <g transform="translate(40 326)"><rect width="98" height="48" rx="12" ${common}/><rect x="110" width="98" height="48" rx="12" ${common}/><rect x="220" width="98" height="48" rx="12" ${common}/>
        <text x="49" y="30" text-anchor="middle">MEM</text><text x="159" y="30" text-anchor="middle">FABRIC</text><text x="269" y="30" text-anchor="middle">CORE</text></g>
      </g>`;
  }
  if (type === "embedded") {
    return `
      <g transform="translate(860 185) scale(.8)">
        <circle cx="190" cy="155" r="145" fill="none" stroke="${accent}" stroke-width="5" stroke-dasharray="14 10"/>
        <g ${common}><rect x="124" y="0" width="132" height="56" rx="14"/><rect x="278" y="126" width="118" height="58" rx="14"/>
        <rect x="122" y="262" width="136" height="58" rx="14"/><rect x="-16" y="126" width="118" height="58" rx="14"/></g>
        <text x="190" y="35" text-anchor="middle">SENSOR</text><text x="337" y="162" text-anchor="middle">DECIDE</text>
        <text x="190" y="298" text-anchor="middle">ACTUATE</text><text x="43" y="162" text-anchor="middle">PLANT</text>
        <circle cx="190" cy="155" r="54" fill="#122238" stroke="${accent2}" stroke-width="3"/>
        <text x="190" y="151" text-anchor="middle">DEADLINE</text><text x="190" y="174" text-anchor="middle">+ JITTER</text>
      </g>`;
  }
  if (type === "npu") {
    return `
      <g transform="translate(886 150) scale(.78)">
        <g ${common}><rect x="0" y="0" width="310" height="56" rx="13"/><rect x="24" y="76" width="286" height="56" rx="13"/>
        <rect x="48" y="152" width="262" height="56" rx="13"/><rect x="72" y="228" width="238" height="56" rx="13"/>
        <rect x="96" y="304" width="214" height="56" rx="13"/></g>
        <text x="155" y="35" text-anchor="middle">MODEL + GRAPH IR</text><text x="167" y="111" text-anchor="middle">PARTITION + MAP</text>
        <text x="179" y="187" text-anchor="middle">BUNDLE + RUNTIME</text><text x="191" y="263" text-anchor="middle">DIGITAL + ACiM</text>
        <text x="203" y="339" text-anchor="middle">PROFILE FEEDBACK</text>
        <path d="M330 332C390 270 390 88 330 28" fill="none" stroke="${accent2}" stroke-width="5" stroke-dasharray="10 8"/>
      </g>`;
  }
  return `
    <g transform="translate(890 160) scale(.84)">
      <circle cx="170" cy="170" r="164" fill="#122238" stroke="${accent}" stroke-width="3"/>
      <g font-size="17" font-weight="800">
        <rect x="54" y="36" width="232" height="48" rx="24" ${common}/><text x="170" y="66" text-anchor="middle">SYSTEMS ENGINEERING</text>
        <rect x="14" y="105" width="150" height="48" rx="24" ${common}/><text x="89" y="135" text-anchor="middle">BACKEND</text>
        <rect x="176" y="105" width="150" height="48" rx="24" ${common}/><text x="251" y="135" text-anchor="middle">HARDWARE</text>
        <rect x="14" y="174" width="150" height="48" rx="24" ${common}/><text x="89" y="204" text-anchor="middle">EMBEDDED</text>
        <rect x="176" y="174" width="150" height="48" rx="24" ${common}/><text x="251" y="204" text-anchor="middle">NPU + ACiM</text>
        <rect x="64" y="252" width="212" height="52" rx="26" fill="#172b45" stroke="${accent2}" stroke-width="3"/><text x="170" y="284" text-anchor="middle">INTERVIEW EVIDENCE</text>
      </g>
    </g>`;
}

function cardSvg(card) {
  const tagWidths = [170, 180, 270];
  let tagX = 78;
  const tags = card.tags.map((tag, index) => {
    const width = tagWidths[index];
    const markup = `<rect x="${tagX}" y="487" width="${width}" height="52" rx="26" fill="#122238" stroke="${card.accent}" stroke-opacity=".58"/><text x="${tagX + width / 2}" y="520" text-anchor="middle" fill="${card.accent}" font-size="18" font-weight="800">${tag}</text>`;
    tagX += width + 16;
    return markup;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#10233b"/></linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${card.accent}"/><stop offset="1" stop-color="${card.accent2}"/></linearGradient>
      <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M52 0H0V52" fill="none" stroke="${card.accent}" stroke-opacity=".07"/></pattern>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <circle cx="1100" cy="70" r="260" fill="${card.accent}" opacity=".055"/>
    <g font-family="Segoe UI, Arial, sans-serif" fill="#eef5ff">
      <rect x="78" y="64" width="58" height="58" rx="14" fill="${card.accent}"/>
      <text x="107" y="101" text-anchor="middle" fill="#07111f" font-family="Consolas, monospace" font-size="20" font-weight="800">SD</text>
      <text x="158" y="103" font-size="27" font-weight="750">System Design Atlas</text>
      <text x="78" y="178" fill="${card.accent}" font-family="Consolas, monospace" font-size="18" font-weight="800" letter-spacing="2">${card.label}</text>
      <text x="78" y="272" font-size="62" font-weight="850">${card.title[0]}</text>
      <text x="78" y="346" fill="url(#accent)" font-size="62" font-weight="850">${card.title[1]}</text>
      <text x="78" y="416" fill="#b5c5d8" font-size="25">${card.subtitle}</text>
      <g font-family="Consolas, monospace">${tags}</g>
      <g font-family="Consolas, monospace" font-size="17" font-weight="750" fill="#dbe8f8">${motifMarkup(card.motif, card.accent, card.accent2)}</g>
      <text x="78" y="586" fill="#70839b" font-family="Consolas, monospace" font-size="17">buicongnguyen.github.io/SystemDesign</text>
    </g>
  </svg>`;
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1
  });
  for (const card of cards) {
    const page = await context.newPage();
    await page.setContent(`<style>html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#07111f}svg{display:block}</style>${cardSvg(card)}`);
    await page.evaluate(() => document.fonts.ready);
    // SVG text occasionally paints one frame after document.fonts.ready in
    // headless Chromium; wait for two stable paint cycles before capture.
    await page.waitForTimeout(500);
    await page.screenshot({
      path: resolve(outputDirectory, card.file),
      type: "png",
      fullPage: false,
      animations: "disabled"
    });
    await page.close();
  }
  await context.close();
} finally {
  await browser.close();
}

console.log(`Generated ${cards.length} route-specific social cards.`);
