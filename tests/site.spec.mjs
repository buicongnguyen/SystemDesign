import { expect, test } from "@playwright/test";
import { listenAtlasServer } from "../scripts/serve.mjs";

let server;

test.beforeAll(async () => {
  server = await listenAtlasServer({ port: 43129 });
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
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });

    const response = await page.goto(entry.path);
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
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    if (entry.current) {
      const current = page.getByRole("link", { name: entry.current, exact: true });
      await expect(current).toHaveAttribute("aria-current", "page");
      const visibleInTrackNav = await current.evaluate(link => {
        const nav = link.closest("nav");
        const linkRect = link.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        return linkRect.right > navRect.left && linkRect.left < navRect.right;
      });
      expect(visibleInTrackNav).toBeTruthy();
    }

    expect(runtimeErrors).toEqual([]);
  });
}

test("theme control follows the OS initially and works from the keyboard", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/index.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeFocused();
});

test("backend decision and coaching controls update meaningful state", async ({ page }) => {
  await page.goto("/backend.html");
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
  await page.goto("/npu-acim.html");
  const schedule = page.getByRole("region", { name: "Double-buffered NPU execution timeline" }).getByRole("table");
  await expect(schedule).toBeVisible();
  await expect(schedule.getByRole("columnheader")).toHaveCount(5);
  await expect(schedule.getByRole("rowheader")).toHaveCount(4);
});
