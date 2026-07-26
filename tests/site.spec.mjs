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
  { path: "/index.html", current: null, social: "social-atlas.png" },
  { path: "/backend.html", current: "Backend", social: "social-backend.png" },
  { path: "/systems-engineering.html", current: "Systems engineering", social: "social-systems.png" },
  { path: "/hardware.html", current: "Hardware", social: "social-hardware.png" },
  { path: "/embedded.html", current: "Embedded", social: "social-embedded.png" },
  { path: "/npu-acim.html", current: "NPU + ACiM", social: "social-npu-acim.png" }
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
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`/assets/${entry.social.replace(".", "\\.")}$`));
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", new RegExp(`/assets/${entry.social.replace(".", "\\.")}$`));

    const tableContract = await page.locator("table").evaluateAll(tables => ({
      captionsMissing: tables.filter(table => !table.querySelector("caption")).length,
      scopesMissing: tables.flatMap(table => [...table.querySelectorAll("th")]).filter(header => !header.hasAttribute("scope")).length
    }));
    expect(tableContract).toEqual({ captionsMissing: 0, scopesMissing: 0 });

    for (const width of [390, 320, 760, 761, 900, 901]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    const clippedCaptions = await page.locator("table caption").evaluateAll(captions => captions.filter(caption => {
      const region = caption.closest('[role="region"]');
      if (!region) return false;
      const captionBox = caption.getBoundingClientRect();
      const regionBox = region.getBoundingClientRect();
      return captionBox.left < regionBox.left - 1
        || captionBox.right > regionBox.right + 1
        || captionBox.width > region.clientWidth + 1;
    }).length);
    expect(clippedCaptions).toBe(0);

    const compactTargets = await page.locator(".site-header nav a, footer > a").evaluateAll(targets => targets.map(target => {
      const box = target.getBoundingClientRect();
      return { height: box.height, width: box.width };
    }));
    expect(compactTargets.every(target => target.height >= 24 && target.width >= 24)).toBeTruthy();

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

test("ACiM sticky feedback rail clears both navigation layers", async ({ page }) => {
  await page.goto(`${origin}/npu-acim.html`);
  for (const width of [761, 900, 901, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const railDocumentTop = await page.locator(".acim-feedback-rail").evaluate(rail => rail.getBoundingClientRect().top + window.scrollY);
    await page.evaluate(top => window.scrollTo({ top: top + 160, behavior: "instant" }), railDocumentTop);
    await expect.poll(() => page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const topics = document.querySelector(".page-nav, .se-page-nav");
      const rail = document.querySelector(".acim-feedback-rail");
      const blockingBottom = Math.max(header.getBoundingClientRect().bottom, topics.getBoundingClientRect().bottom);
      return getComputedStyle(rail).position === "sticky"
        && rail.getBoundingClientRect().top >= blockingBottom - 1;
    })).toBeTruthy();
  }
});

test("Roofline bandwidth slope meets the compute ceiling at one knee", async ({ page }) => {
  await page.goto(`${origin}/hardware.html`);
  for (const width of [520, 1000, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const knee = await page.evaluate(() => {
      const bandwidth = document.querySelector(".hw-roofline-bandwidth").getBoundingClientRect();
      const ceiling = document.querySelector(".hw-roofline-ceiling").getBoundingClientRect();
      return {
        horizontalGap: Math.abs(bandwidth.right - ceiling.left),
        verticalGap: Math.abs(bandwidth.top - ceiling.top)
      };
    });
    expect(knee.horizontalGap).toBeLessThanOrEqual(1);
    expect(knee.verticalGap).toBeLessThanOrEqual(1);
  }
  const labelSizes = await page.locator(".hw-roofline-plot").evaluate(plot => {
    const targets = [plot, ...plot.querySelectorAll(".hw-roofline-label, .hw-roofline-dot small")];
    const pseudoSizes = [
      Number.parseFloat(getComputedStyle(plot, "::before").fontSize),
      Number.parseFloat(getComputedStyle(plot, "::after").fontSize)
    ];
    return [...targets.slice(1).map(target => Number.parseFloat(getComputedStyle(target).fontSize)), ...pseudoSizes];
  });
  expect(labelSizes.every(size => size >= 13)).toBeTruthy();
});

test("hash navigation marks and reveals the active interview topic", async ({ page }) => {
  for (const entry of pages.filter(pageEntry => pageEntry.current)) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${origin}${entry.path}#practice`);
    const topicNav = page.locator(".page-nav, .se-page-nav");
    const practice = topicNav.locator('a[href="#practice"]');
    await expect(practice).toHaveAttribute("aria-current", "location");
    await expect.poll(() => practice.evaluate(link => {
      const navBox = link.closest("nav").getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      return linkBox.left >= navBox.left - 1 && linkBox.right <= navBox.right + 1;
    })).toBeTruthy();
  }
});

test("embedded interrupt and DMA flow preserves numbered direction on mobile", async ({ page }) => {
  await page.goto(`${origin}/embedded.html#interrupts`);
  for (const width of [320, 520, 760]) {
    await page.setViewportSize({ width, height: 844 });
    const flow = page.locator(".em-irq-flow");
    await expect(flow).toHaveCSS("grid-template-columns", /.+/);
    const sequence = await flow.locator("li").evaluateAll(items => items.map(item => ({
      step: item.dataset.step,
      number: getComputedStyle(item, "::before").content,
      arrow: getComputedStyle(item, "::after").content
    })));
    expect(sequence.map(item => item.step)).toEqual(["01", "02", "03", "04", "05", "06"]);
    expect(sequence.map(item => item.number)).toEqual(['"01"', '"02"', '"03"', '"04"', '"05"', '"06"']);
    expect(sequence.slice(0, -1).every(item => item.arrow === '"↓"')).toBeTruthy();
  }
});

test("shared interview mode times, hides coaching, tracks progress, and scores a response", async ({ page }) => {
  await page.goto(`${origin}/backend.html#practice`);
  const trigger = page.getByRole("button", { name: /Interview mode/ });
  await trigger.click();

  const panel = page.locator("#interview-mode-panel");
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("body")).toHaveClass(/interview-coaching-hidden/);
  await expect(page.locator("#practice details").first()).toBeHidden();
  await expect(panel.locator(".interview-timer strong")).toHaveText("45:00");

  await panel.getByRole("button", { name: "Start timer" }).click();
  await expect.poll(async () => panel.locator(".interview-timer strong").textContent()).not.toBe("45:00");
  await panel.getByRole("button", { name: "Pause timer" }).click();

  await panel.getByLabel("Hide coaching notes").uncheck();
  await expect(page.locator("#practice details").first()).toBeVisible();
  await panel.getByLabel("Clarify").check();
  await panel.getByText("Self-score the answer").click();
  await panel.getByLabel("Scope and requirements score").selectOption("2");
  await panel.getByLabel("Quantitative reasoning score").selectOption("2");
  await expect(panel.locator(".interview-rubric output")).toContainText("4/10");

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await panel.getByRole("button", { name: "End session" }).click();
  await expect(page.locator("body")).not.toHaveClass(/interview-session-active/);
});

test("dense diagrams expand, zoom, and close from the keyboard", async ({ page }) => {
  await page.goto(`${origin}/hardware.html#memory`);
  const diagram = page.locator(".hw-roofline");
  const expand = diagram.getByRole("button", { name: "Expand Simplified Roofline performance model" });
  await expand.click();
  await expect(diagram).toHaveClass(/is-expanded/);
  await expect(page.locator("body")).toHaveClass(/diagram-expanded/);

  await diagram.getByRole("button", { name: "Zoom in diagram" }).click();
  await expect(diagram).toHaveAttribute("data-zoom-level", "1.15");
  await page.keyboard.press("Escape");
  await expect(diagram).not.toHaveClass(/is-expanded/);
  await expect(expand).toBeFocused();
});

test("wide tables expose directional edge cues as users pan", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`${origin}/npu-acim.html#bottlenecks`);
  const wrapper = page.locator(".acim-table-wrap");
  await expect(wrapper).toHaveAttribute("data-horizontal-scroll", "available");
  await expect(wrapper).toHaveClass(/can-scroll-right/);

  await wrapper.evaluate(element => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(wrapper).toHaveClass(/can-scroll-left/);
  await expect(wrapper).not.toHaveClass(/can-scroll-right/);
});

test("preview server exposes only the deployable allowlist", async ({ request }) => {
  const publicResponse = await request.get(`${origin}/index.html`);
  expect(publicResponse.status()).toBe(200);

  for (const { social } of pages) {
    const socialResponse = await request.get(`${origin}/assets/${social}`);
    expect(socialResponse.status()).toBe(200);
    expect(socialResponse.headers()["content-type"]).toBe("image/png");
  }

  const repositoryResponse = await request.get(`${origin}/package.json`);
  expect(repositoryResponse.status()).toBe(404);

  const methodResponse = await request.post(`${origin}/index.html`);
  expect(methodResponse.status()).toBe(405);

  const hostResponse = await request.get(`${origin}/index.html`, { headers: { Host: "untrusted.example" } });
  expect(hostResponse.status()).toBe(421);
});
