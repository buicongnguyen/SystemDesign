import { readFile } from "node:fs/promises";
import { pages } from "./site-files.mjs";

const timeoutMilliseconds = 20_000;
const concurrency = 6;
const toleratedStatuses = new Set([401, 403, 405, 429]);

function externalLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(https:\/\/.*?)\1/gis)]
    .map(match => match[2].replace(/&(?:amp|#38|#x26);/gi, "&"));
}

const documents = await Promise.all(pages.map(file => readFile(file, "utf8")));
const links = [...new Set(documents.flatMap(externalLinks))].sort();

async function request(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
      "User-Agent": "SystemDesign-Atlas-Link-Check/1.0 (+https://github.com/buicongnguyen/SystemDesign)"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMilliseconds)
  });
  await response.body?.cancel();
  return response.status;
}

async function check(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const status = await request(url);
      if (status >= 200 && status < 400) return { url, status, result: "ok" };
      if (toleratedStatuses.has(status)) return { url, status, result: "inconclusive" };
      if (status < 500) return { url, status, result: "failed" };
      if (attempt === 2) return { url, status, result: "inconclusive" };
    } catch (error) {
      lastError = error;
      if (attempt === 2) return { url, error: error.message, result: "inconclusive" };
    }
  }
  return { url, error: lastError?.message || "unknown error", result: "inconclusive" };
}

const results = [];
let nextIndex = 0;

async function worker() {
  while (nextIndex < links.length) {
    const index = nextIndex;
    nextIndex += 1;
    results[index] = await check(links[index]);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, links.length) }, worker));

for (const result of results.filter(item => item.result === "inconclusive")) {
  const detail = result.status ? `HTTP ${result.status}` : result.error;
  console.warn(`::warning title=External link inconclusive::${result.url} (${detail})`);
}

const failures = results.filter(item => item.result === "failed");
for (const failure of failures) {
  const detail = failure.status ? `HTTP ${failure.status}` : failure.error;
  console.error(`::error title=External link failed::${failure.url} (${detail})`);
}

if (failures.length) {
  throw new Error(`${failures.length} of ${links.length} external links returned a failing HTTP status.`);
}

console.log(`External link check completed: ${links.length} unique HTTPS links, ${results.filter(item => item.result === "ok").length} reachable, ${results.filter(item => item.result === "inconclusive").length} inconclusive.`);
