import { expect, test } from "@playwright/test";
import { listenAtlasServer } from "../scripts/serve.mjs";

let server;
let origin;

test.beforeAll(async () => {
  server = await listenAtlasServer({ port: 0 });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Atlas test server did not expose a TCP port");
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolveClose, rejectClose) => {
    server.close(error => error ? rejectClose(error) : resolveClose());
  });
});

const pages = [
  { path: "/index.html", current: null },
  { path: "/backend.html", current: "Backend" },
  { path: "/systems-engineering.html", current: "Systems engineering" },
  { path: "/hardware.html", current: "Hardware" },
  { path: "/embedded.html", current: "Embedded" },
  { path: "/npu-acim.html", current: "NPU + ACiM" }
];

for (const entry of pages) {
  test(`${entry.path} has a sound responsive document contract`, async ({ page }) => {
    const runtimeErrors = [];
    await page.emulateMedia({ reducedMotion: "reduce" });
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(`${origin}${entry.path}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('a[href="#main"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel~="icon"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    const tableContract = await page.locator("table").evaluateAll(tables => ({
      captionsMissing: tables.filter(table => !table.querySelector("caption")).length,
      scopesMissing: tables.flatMap(table => [...table.querySelectorAll("th")]).filter(header => !header.hasAttribute("scope")).length
    }));
    expect(tableContract).toEqual({ captionsMissing: 0, scopesMissing: 0 });

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    if (entry.current) {
      const current = page.getByRole("link", { name: entry.current, exact: true });
      await expect(current).toHaveAttribute("aria-current", "page");
      const fullyVisible = () => current.evaluate(link => {
        const nav = link.closest("nav");
        const linkRect = link.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        return linkRect.left >= navRect.left - 1 && linkRect.right <= navRect.right + 1;
      });
      await expect.poll(fullyVisible).toBeTruthy();

      const centering = await current.evaluate(link => {
        const nav = link.closest("nav");
        const linkRect = link.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        const maximumScroll = nav.scrollWidth - nav.clientWidth;
        const edgeClamped = nav.scrollLeft <= 1 || nav.scrollLeft >= maximumScroll - 1;
        return { edgeClamped, centerError: Math.abs((linkRect.left + linkRect.right) / 2 - (navRect.left + navRect.right) / 2) };
      });
      if (!centering.edgeClamped) expect(centering.centerError).toBeLessThanOrEqual(1);

      await page.setViewportSize({ width: 1280, height: 844 });
      await expect.poll(() => current.evaluate(link => link.closest("nav").scrollLeft)).toBeLessThanOrEqual(1);
      await expect.poll(fullyVisible).toBeTruthy();
      await page.setViewportSize({ width: 320, height: 844 });
      await expect.poll(fullyVisible).toBeTruthy();

      const pageNav = page.locator(".page-nav, .se-page-nav");
      const topicDocumentTop = await pageNav.evaluate(nav => nav.getBoundingClientRect().top + window.scrollY);
      await page.evaluate(top => window.scrollTo({ top: top + 200, behavior: "instant" }), topicDocumentTop);
      await expect.poll(() => page.evaluate(originalTop => {
        const header = document.querySelector(".site-header");
        const topics = document.querySelector(".page-nav, .se-page-nav");
        return window.scrollY > originalTop
          && Math.abs(topics.getBoundingClientRect().top - header.getBoundingClientRect().bottom) <= 1;
      }, topicDocumentTop)).toBeTruthy();
    }

    expect(runtimeErrors).toEqual([]);
  });
}

test("theme control follows the OS initially and works from the keyboard", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`${origin}/index.html`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeFocused();
});

test("backend decision and coaching controls update meaningful state", async ({ page }) => {
  await page.goto(`${origin}/backend.html`);
  const dataVolume = page.getByRole("button", { name: "03 Data volume", exact: true });
  await dataVolume.click();
  await expect(dataVolume).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#decision-answer")).toContainText("live-set growth");

  const coaching = page.locator("summary").first();
  const disclosure = coaching.locator("xpath=..");
  const before = await disclosure.getAttribute("open");
  await coaching.click();
  const after = await disclosure.getAttribute("open");
  expect(after).not.toBe(before);
});

test("ACiM double-buffer schedule exposes table semantics", async ({ page }) => {
  await page.goto(`${origin}/npu-acim.html`);
  const schedule = page.getByRole("region", { name: "Double-buffered NPU execution timeline" }).getByRole("table");
  await expect(schedule).toBeVisible();
  await expect(schedule.getByRole("columnheader")).toHaveCount(5);
  await expect(schedule.getByRole("rowheader")).toHaveCount(4);
});

test("preview server exposes only the deployable allowlist", async ({ request }) => {
  const publicResponse = await request.get(`${origin}/index.html`);
  expect(publicResponse.status()).toBe(200);

  const repositoryResponse = await request.get(`${origin}/package.json`);
  expect(repositoryResponse.status()).toBe(404);

  const methodResponse = await request.post(`${origin}/index.html`);
  expect(methodResponse.status()).toBe(405);

  const hostResponse = await request.get(`${origin}/index.html`, { headers: { Host: "untrusted.example" } });
  expect(hostResponse.status()).toBe(421);
});
