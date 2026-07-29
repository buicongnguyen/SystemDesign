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
  {
    path: "/index.html",
    chapter: "Chapter 0",
    social: "social-atlas.png",
    sections: ["#top", "#tracks", "#shared-core", "#selector", "#cross-track-case", "#practice"]
  },
  {
    path: "/backend.html",
    chapter: "Chapter 1",
    social: "social-backend.png",
    sections: ["#top", "#request", "#scale", "#decisions", "#data-decisions", "#distributed-tradeoffs", "#fast-slow-paths", "#reliability", "#interview", "#thinking-flow", "#workbench", "#practice", "#resources"]
  },
  {
    path: "/systems-engineering.html",
    chapter: "Chapter 2",
    social: "social-systems.png",
    sections: ["#top", "#context", "#conops", "#process", "#allocation", "#interfaces", "#budgets", "#trades", "#risk", "#integration", "#verification", "#evidence-package", "#practice", "#resources"]
  },
  {
    path: "/hardware.html",
    chapter: "Chapter 3",
    social: "social-hardware.png",
    sections: ["#top", "#thinking", "#metrics", "#constraints", "#memory", "#compute", "#fabric", "#physical", "#bottlenecks", "#sizing-workbench", "#lifecycle", "#practice", "#resources"]
  },
  {
    path: "/embedded.html",
    chapter: "Chapter 4",
    social: "social-embedded.png",
    sections: ["#top", "#loop", "#partition", "#scheduling", "#interrupts", "#modes", "#protocols", "#safety", "#verification", "#timing-workbench", "#practice", "#resources"]
  },
  {
    path: "/npu-acim.html",
    chapter: "Chapter 5",
    social: "social-npu-acim.png",
    sections: ["#top", "#boundary", "#stack", "#decision", "#mapping", "#artifacts", "#runtime", "#feedback", "#bottlenecks", "#compiler-workbench", "#practice", "#sources"]
  }
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

    const compactTargets = await page.locator(".site-header > :is(a, button), footer > a").evaluateAll(targets => targets.map(target => {
      const box = target.getBoundingClientRect();
      return { height: box.height, width: box.width };
    }));
    expect(compactTargets.every(target => target.height >= 24 && target.width >= 24)).toBeTruthy();

    const bookSidebar = page.locator("#book-sidebar");
    await expect(bookSidebar).toHaveCount(1);
    await expect(bookSidebar.locator(".book-chapter-link")).toHaveCount(6);
    await expect(bookSidebar.locator('.book-chapter-link[aria-current="page"]')).toHaveCount(1);
    await expect(bookSidebar.locator('.book-chapter-link[aria-current="page"] span')).toHaveText(entry.chapter);
    await expect(bookSidebar.locator(".book-section-list")).toHaveCount(1);
    await expect(bookSidebar.locator(".book-section-link")).toHaveCount(entry.sections.length);
    await expect(bookSidebar.locator('.book-section-link[aria-current="location"]')).toHaveCount(1);
    await expect(bookSidebar.locator(".book-current-bookmark")).toHaveCount(1);
    await expect(bookSidebar.locator(".book-current-bookmark")).toHaveText("Here");

    expect(runtimeErrors).toEqual([]);
  });
}

test("book outline exposes every chapter and current-page section", async ({ page }) => {
  const expectedChapters = [
    "Chapter 0 System Design Atlas",
    "Chapter 1 Backend & Distributed Systems",
    "Chapter 2 Systems Engineering",
    "Chapter 3 Hardware Architecture",
    "Chapter 4 Embedded & Cyber-Physical Systems",
    "Chapter 5 NPU + ACiM Software Stack"
  ];

  for (const entry of pages) {
    await page.goto(`${origin}${entry.path}`);
    const sidebar = page.locator("#book-sidebar");
    const chapterLabels = await sidebar.locator(".book-chapter-link").evaluateAll(links => links.map(link => {
      const chapter = link.querySelector(":scope > span")?.textContent || "";
      const title = link.querySelector(":scope > strong")?.textContent || "";
      return `${chapter} ${title}`.replace(/\s+/g, " ").trim();
    }));
    expect(chapterLabels).toEqual(expectedChapters);

    const sectionHrefs = await sidebar.locator(".book-section-link").evaluateAll(links => links.map(link => link.getAttribute("href")));
    expect(sectionHrefs).toEqual(entry.sections);
    for (const href of entry.sections) {
      await expect(page.locator(href)).toHaveCount(1);
    }
    await expect(sidebar.locator('.book-chapter-link[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.locator('.book-section-link[aria-current="location"]')).toHaveCount(1);
    await expect(page.locator(".page-nav, .se-page-nav")).toBeHidden();
    await expect(page.locator(".book-chapter-pagination")).toHaveCount(1);
  }
});

test("desktop book rail stays beside the reading pane", async ({ page }) => {
  await page.goto(`${origin}/hardware.html`);
  for (const width of [1220, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    const geometry = await page.evaluate(() => {
      const header = document.querySelector(".site-header").getBoundingClientRect();
      const sidebar = document.querySelector("#book-sidebar");
      const sidebarBox = sidebar.getBoundingClientRect();
      const contents = sidebar.querySelector(".book-contents");
      const shell = document.querySelector(".book-page-shell").getBoundingClientRect();
      const sidebarStyle = getComputedStyle(sidebar);
      const contentsStyle = getComputedStyle(contents);
      return {
        headerBottom: header.bottom,
        sidebarTop: sidebarBox.top,
        sidebarBottom: sidebarBox.bottom,
        sidebarRight: sidebarBox.right,
        shellLeft: shell.left,
        position: sidebarStyle.position,
        sidebarOverflowY: sidebarStyle.overflowY,
        contentsOverflowY: contentsStyle.overflowY,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    expect(Math.abs(geometry.sidebarTop - geometry.headerBottom)).toBeLessThanOrEqual(1);
    expect(geometry.sidebarBottom).toBeLessThanOrEqual(844);
    expect(geometry.sidebarRight).toBeLessThanOrEqual(geometry.shellLeft + 1);
    expect(geometry.position).toBe("fixed");
    expect(geometry.sidebarOverflowY).toBe("hidden");
    expect(geometry.contentsOverflowY).toBe("auto");
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
  }
});

test("selected chapter reads as a bookmark rather than a section marker", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(`${origin}/backend.html#reliability`);
  const visualContract = await page.evaluate(() => {
    const chapter = document.querySelector('.book-chapter-link[aria-current="page"]');
    const section = document.querySelector('.book-section-link[aria-current="location"]');
    const bookmark = chapter.querySelector(".book-current-bookmark");
    const location = document.querySelector("#book-location-section");
    return {
      chapterBackground: getComputedStyle(chapter).backgroundColor,
      sectionBackground: getComputedStyle(section).backgroundColor,
      bookmarkClip: getComputedStyle(bookmark).clipPath,
      locationWhiteSpace: getComputedStyle(location).whiteSpace
    };
  });
  expect(visualContract.chapterBackground).not.toBe(visualContract.sectionBackground);
  expect(visualContract.bookmarkClip).not.toBe("none");
  expect(visualContract.locationWhiteSpace).toBe("normal");
});

test("mobile book drawer traps focus and restores the Contents trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/systems-engineering.html#risk`);
  const trigger = page.locator(".book-nav-toggle");
  const sidebar = page.locator("#book-sidebar");
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const target = document.querySelector("#risk").getBoundingClientRect();
    return target.top - header.bottom;
  })).toBeGreaterThanOrEqual(-1);
  await expect(sidebar.locator('[data-book-section="risk"]')).toHaveAttribute("aria-current", "location");
  const readingPosition = await page.evaluate(() => window.scrollY);

  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  await expect(sidebar).toHaveAttribute("role", "dialog");
  await expect(sidebar).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("body")).toHaveClass(/book-nav-open/);
  await expect(sidebar.locator('.book-section-link[aria-current="location"]')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(readingPosition, 0);
  expect(await page.locator(".book-page-shell").evaluate(shell => shell.inert)).toBeTruthy();
  expect(await page.locator(".book-reading-progress").evaluate(progress => progress.inert)).toBeTruthy();

  await trigger.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(sidebar.locator('.book-section-link[aria-current="location"]')).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => document.querySelector("#book-sidebar").contains(document.activeElement))).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/book-nav-open/);
  expect(await page.locator(".book-page-shell").evaluate(shell => shell.inert)).toBeFalsy();
  expect(await page.locator(".book-reading-progress").evaluate(progress => progress.inert)).toBeFalsy();

  for (const width of [1219, 1220]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1219, height: 844 });
  await trigger.click();
  await page.setViewportSize({ width: 1220, height: 844 });
  await expect(page.locator("body")).not.toHaveClass(/book-nav-open/);
  await expect(sidebar).not.toHaveAttribute("aria-hidden", "true");
  await expect(sidebar).not.toHaveAttribute("role");
  await expect(sidebar).not.toHaveAttribute("aria-modal");
  await expect(sidebar.locator('.book-chapter-link[aria-current="page"]')).toBeFocused();
  await page.setViewportSize({ width: 1219, height: 844 });
  await expect(trigger).toBeFocused();
});

test("mobile contents selection closes the drawer and updates the reading location", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/embedded.html#loop`);
  const trigger = page.locator(".book-nav-toggle");
  const sidebar = page.locator("#book-sidebar");
  await trigger.click();
  await sidebar.locator('[data-book-section="protocols"]').click();

  await expect(page).toHaveURL(/embedded\.html#protocols$/);
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(sidebar.locator('[data-book-section="protocols"]')).toHaveAttribute("aria-current", "location");
  await expect.poll(() => page.evaluate(() => {
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const target = document.querySelector("#protocols").getBoundingClientRect();
    return target.top - header.bottom;
  })).toBeGreaterThanOrEqual(-1);
});

test("mobile interview mode closes the book drawer before taking focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/backend.html#practice`);
  const contents = page.locator(".book-nav-toggle");
  await contents.click();
  await page.getByRole("button", { name: /Interview mode/ }).click();

  await expect(page.locator("#book-sidebar")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("body")).not.toHaveClass(/book-nav-open/);
  await expect(page.locator("#interview-mode-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close interview controls" })).toBeFocused();

  await contents.click();
  await expect(page.locator("#interview-mode-panel")).toBeHidden();
  await expect(page.locator("#book-sidebar")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#book-sidebar .book-section-link[aria-current=\"location\"]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#book-sidebar")).toHaveAttribute("aria-hidden", "true");
  await expect(contents).toBeFocused();
});

test("book breakpoint preserves the reader's within-section position", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/backend.html#reliability`);
  await page.evaluate(() => {
    const section = document.querySelector("#reliability");
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: sectionTop + section.getBoundingClientRect().height - 500, behavior: "instant" });
  });
  await expect(page.locator('[data-book-section="reliability"]')).toHaveAttribute("aria-current", "location");

  const before = await page.evaluate(() => {
    const section = document.querySelector("#reliability");
    const box = section.getBoundingClientRect();
    return (window.scrollY - (box.top + window.scrollY)) / box.height;
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.locator('[data-book-section="reliability"]')).toHaveAttribute("aria-current", "location");
  await expect.poll(async () => page.evaluate(() => {
    const section = document.querySelector("#reliability");
    const box = section.getBoundingClientRect();
    return (window.scrollY - (box.top + window.scrollY)) / box.height;
  })).toBeCloseTo(before, 1);
});

test("dense track diagrams reflow for the rail-reduced reading pane", async ({ page }) => {
  const contracts = [
    { path: "/hardware.html", selector: ".hw-bringup-ladder", wideColumns: 7, railColumns: 2 },
    { path: "/embedded.html", selector: ".em-integration-staircase", wideColumns: 6, railColumns: 3 },
    { path: "/npu-acim.html", selector: ".acim-integration-staircase", wideColumns: 7, railColumns: 4 }
  ];
  const columnCount = selector => page.locator(selector).evaluate(element => (
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
  ));

  for (const contract of contracts) {
    await page.setViewportSize({ width: 1440, height: 844 });
    await page.goto(`${origin}${contract.path}`);
    expect(await columnCount(contract.selector)).toBe(contract.wideColumns);
    await page.setViewportSize({ width: 1220, height: 844 });
    await expect.poll(() => columnCount(contract.selector)).toBe(contract.railColumns);
  }
});

test("scrollspy follows the current section without rewriting the URL", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(`${origin}/backend.html`);
  const initialUrl = page.url();
  await page.evaluate(() => {
    const target = document.querySelector("#reliability");
    const header = document.querySelector(".site-header");
    const top = target.getBoundingClientRect().top + window.scrollY - header.getBoundingClientRect().height - 20;
    window.scrollTo({ top, behavior: "instant" });
  });

  const sidebar = page.locator("#book-sidebar");
  await expect(sidebar.locator('[data-book-section="reliability"]')).toHaveAttribute("aria-current", "location");
  await expect(sidebar.locator('.book-section-link[aria-current="location"]')).toHaveCount(1);
  await expect(sidebar.locator("#book-location-section")).toContainText("Reliability stack");
  const activeLinkIsVisible = await sidebar.locator('[data-book-section="reliability"]').evaluate(link => {
    const contents = link.closest(".book-contents").getBoundingClientRect();
    const box = link.getBoundingClientRect();
    return box.top >= contents.top - 1 && box.bottom <= contents.bottom + 1;
  });
  expect(activeLinkIsVisible).toBeTruthy();
  expect(page.url()).toBe(initialUrl);
});

test("saved reading place resumes across chapters", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(`${origin}/embedded.html`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.evaluate(() => {
    const target = document.querySelector("#protocols");
    const header = document.querySelector(".site-header");
    const top = target.getBoundingClientRect().top + window.scrollY - header.getBoundingClientRect().height - 20;
    window.scrollTo({ top, behavior: "instant" });
  });
  await expect(page.locator('[data-book-section="protocols"]')).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "Save current place" }).click();
  await expect(page.locator(".book-save-status")).toContainText("Saved your place at Chapter 4");
  const savedY = await page.evaluate(() => JSON.parse(localStorage.getItem("system-design-atlas-reading-place-v1")).y);

  await page.goto(`${origin}/hardware.html`);
  const resume = page.locator(".book-resume-place");
  await expect(resume).toHaveAttribute("href", "embedded.html#protocols");
  await expect(resume).toContainText("Chapter 4 · Embedded");
  await expect(resume).toContainText("Protocol selection");
  await resume.click();
  await expect(page).toHaveURL(/embedded\.html#protocols$/);
  await expect(page.locator('[data-book-section="protocols"]')).toHaveAttribute("aria-current", "location");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(savedY, 0);
});

test("saved reading place stays inside its section after responsive reflow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto(`${origin}/backend.html`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    const section = document.querySelector("#reliability");
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: sectionTop + 520, behavior: "instant" });
  });
  await expect(page.locator('[data-book-section="reliability"]')).toHaveAttribute("aria-current", "location");
  await page.getByRole("button", { name: "Save current place" }).click();
  const savedProgress = await page.evaluate(() => (
    JSON.parse(localStorage.getItem("system-design-atlas-reading-place-v1")).sectionProgress
  ));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/hardware.html`);
  await page.locator(".book-nav-toggle").click();
  await page.locator(".book-resume-place").click();
  await expect(page).toHaveURL(/backend\.html#reliability$/);
  await expect(page.locator('[data-book-section="reliability"]')).toHaveAttribute("aria-current", "location");
  await expect.poll(() => page.evaluate(() => {
    const section = document.querySelector("#reliability");
    const box = section.getBoundingClientRect();
    const sectionTop = box.top + window.scrollY;
    return (window.scrollY - sectionTop) / box.height;
  })).toBeCloseTo(savedProgress, 1);
});

test("deep links remain visible below the book header", async ({ page }) => {
  for (const width of [320, 1220]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/npu-acim.html#artifacts`);
    await expect(page.locator('[data-book-section="artifacts"]')).toHaveAttribute("aria-current", "location");
    const clearance = await page.evaluate(() => {
      const header = document.querySelector(".site-header").getBoundingClientRect();
      const target = document.querySelector("#artifacts").getBoundingClientRect();
      return target.top - header.bottom;
    });
    expect(clearance).toBeGreaterThanOrEqual(-1);
  }
});

test("lifecycle phase contracts remain complete and ordered", async ({ page }) => {
  const contracts = [
    {
      path: "/index.html",
      model: "shared-lifecycle",
      labels: ["Need", "Requirements", "Estimate", "Decompose", "Allocate", "Trade", "Realize", "Integrate", "Verify", "Validate", "Transition", "Operate, evolve & retire"]
    },
    {
      path: "/backend.html",
      model: "backend-interview",
      labels: ["Clarify scope and priorities", "Size the system", "Draw the simplest main path", "Get buy-in on the deep dive", "Stress the design with evidence", "Make change, ownership and exit safe"]
    },
    {
      path: "/backend.html",
      model: "backend-reasoning",
      labels: ["Clarify scope", "Set quality targets", "Estimate scale", "Define contracts + evolution", "Model the data", "Draw the simplest flow", "Align on the deep dive", "Find the bottleneck", "Add one fitting pattern", "Design failure behavior", "Recheck trade-offs", "Prove the design", "Launch, operate, evolve & retire"]
    },
    {
      path: "/systems-engineering.html",
      model: "systems-engineering-lifecycle",
      labels: ["Stakeholder needs", "ConOps", "Measures", "Requirements", "Functions", "Alternatives", "Allocate", "Balance", "Realize", "Integrate", "Verify", "Validate", "Transition", "Operate · sustain · retire"]
    },
    {
      path: "/hardware.html",
      model: "hardware-lifecycle",
      labels: ["Characterize the workload", "Set measurable targets", "Count data movement", "Expose parallelism", "Choose compute", "Build the memory + fabric", "Close physical budgets", "Plan proof + observability", "Implement + sign off", "Bring up", "Verify requirements", "Validate intended use", "Qualify configuration", "Accept + release", "Sustain + retire"]
    },
    {
      path: "/embedded.html",
      model: "embedded-lifecycle",
      labels: ["Define mission + environment", "Set timing + quality", "Model the plant", "Characterize plant + I/O", "Partition functions", "Schedule + communicate", "Design modes + faults", "Implement + integrate", "Verify + validate", "Transition + sustain", "Retire safely"]
    },
    {
      path: "/npu-acim.html",
      model: "acim-lifecycle",
      labels: ["Frame intended use", "Baseline requirements + reference", "Characterize target", "Compile + map", "Implement + integrate", "Verify", "Validate intended use", "Qualify configuration", "Accept + release", "Operate + evolve", "Retire"]
    }
  ];

  for (const contract of contracts) {
    await page.goto(`${origin}${contract.path}`);
    const flow = page.locator(`[data-phase-model="${contract.model}"]`);
    await expect(flow).toHaveCount(1);
    await expect(flow).toHaveAttribute("data-phase-count", String(contract.labels.length));
    await expect(flow.locator(":scope > li")).toHaveCount(contract.labels.length);
    const labels = await flow.locator(":scope > li strong").allTextContents();
    expect(labels.map(label => label.replace(/\s+/g, " ").trim())).toEqual(contract.labels);
  }
});

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

test("track-specific interview timer follows the declared practice duration", async ({ page }) => {
  await page.goto(`${origin}/systems-engineering.html#practice`);
  await page.getByRole("button", { name: /Interview mode/ }).click();
  const panel = page.locator("#interview-mode-panel");
  await expect(panel.locator("header span")).toHaveText("55-minute practice");
  await expect(panel.locator(".interview-timer strong")).toHaveText("55:00");
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

test("ACiM sticky feedback rail clears the book header", async ({ page }) => {
  await page.goto(`${origin}/npu-acim.html`);
  for (const width of [761, 900, 901, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const railDocumentTop = await page.locator(".acim-feedback-rail").evaluate(rail => rail.getBoundingClientRect().top + window.scrollY);
    await page.evaluate(top => window.scrollTo({ top: top + 160, behavior: "instant" }), railDocumentTop);
    await expect.poll(() => page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const rail = document.querySelector(".acim-feedback-rail");
      return getComputedStyle(rail).position === "sticky"
        && rail.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1;
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

test("hash navigation marks the active book section", async ({ page }) => {
  for (const entry of pages) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`${origin}${entry.path}#practice`);
    const practice = page.locator('#book-sidebar a[href="#practice"]');
    await expect(practice).toHaveAttribute("aria-current", "location");
    await expect(page.locator('#book-sidebar .book-section-link[aria-current="location"]')).toHaveCount(1);
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

test("lifecycle diagrams keep mobile arrows and controls clear", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`${origin}/npu-acim.html#stack`);
  const lifecycleItems = await page.locator(".acim-lifecycle-flow > li").evaluateAll(items => items.map(item => ({
    clientWidth: item.clientWidth,
    scrollWidth: item.scrollWidth,
    arrow: getComputedStyle(item, "::after").content,
    arrowLeft: Number.parseFloat(getComputedStyle(item, "::after").left)
  })));
  expect(lifecycleItems.slice(0, -1).every(item => item.arrow === '"↓"' && Math.abs(item.arrowLeft - item.clientWidth / 2) <= 1)).toBeTruthy();
  expect(lifecycleItems.every(item => item.scrollWidth - item.clientWidth <= 1)).toBeTruthy();

  const diagrams = [
    { path: "/embedded.html#verification", selector: ".em-integration-board" },
    { path: "/npu-acim.html#stack", selector: ".acim-lifecycle-board" },
    { path: "/npu-acim.html#runtime", selector: ".acim-integration-board" }
  ];
  for (const diagram of diagrams) {
    await page.goto(`${origin}${diagram.path}`);
    for (const width of [320, 390, 761]) {
      await page.setViewportSize({ width, height: 844 });
      const overlaps = await page.locator(diagram.selector).evaluate(board => {
        const heading = board.querySelector("h3").getBoundingClientRect();
        const toolbar = board.querySelector(".diagram-toolbar").getBoundingClientRect();
        return heading.left < toolbar.right
          && heading.right > toolbar.left
          && heading.top < toolbar.bottom
          && heading.bottom > toolbar.top;
      });
      expect(overlaps).toBeFalsy();
    }
  }
});

test("relationship diagrams expose the intended choices and reflow as vertical memory paths", async ({ page }) => {
  const contracts = [
    {
      path: "/index.html#shared-core",
      selector: ".atlas-lifecycle-rails",
      stack: ".atlas-lifecycle-groups",
      desktopColumns: 6,
      arrowCount: 5,
      orders: [[".atlas-lifecycle-groups > li > strong", ["Define", "Analyze", "Architect", "Realize", "Prove", "Sustain"]]],
      counts: [[".atlas-lifecycle-groups > li", 6], [".atlas-continuous-concerns > li", 5]]
    },
    {
      path: "/backend.html",
      selector: ".backend-reliability-loop",
      stack: ".backend-causal-cycle",
      desktopColumns: 5,
      arrowCount: 4,
      orders: [[".backend-causal-cycle > li > strong", ["A dependency slows or admitted arrivals exceed capacity", "Queues and in-flight work grow", "Pools and queues fill", "Tail latency and timeouts rise", "Retries multiply offered load"]]],
      counts: [[".backend-causal-cycle > li", 5], [".backend-causal-return", 1]]
    },
    {
      path: "/systems-engineering.html#evidence-package",
      selector: ".se-evidence-plan-map",
      stack: ".se-evidence-plan-choices",
      desktopColumns: 3,
      arrowCount: 4,
      orders: [
        [".se-evidence-plan-choices > li > span", ["Path A · estimate", "Path B · conformance", "Path C · compare"]],
        [".se-evidence-decision-cycle > li > strong", ["Freeze", "Observe", "Bound", "Decide", "Audit coverage"]]
      ],
      counts: [[".se-evidence-plan-choices > li", 3], [".se-evidence-validity-gates > article", 2], [".se-evidence-decision-cycle > li", 5]]
    },
    {
      path: "/hardware.html#compute",
      selector: ".hw-engine-selector",
      stack: ".hw-engine-root-branches",
      desktopColumns: 2,
      arrowCount: 0,
      orders: [
        [".hw-engine-root-branches > article > span", ["Yes · stop specializing"]],
        [".hw-engine-root-branches > article > strong", ["CPU"]],
        [".hw-engine-root-branches > section > span", ["No · isolate the measured hotspot"]],
        [".hw-engine-structure-options > article > strong", ["GPU / programmable NPU candidate", "FPGA", "Heterogeneous / repartition"]]
      ],
      counts: [[".hw-engine-structure-options > article", 3], [".hw-engine-whole-path li", 5]]
    },
    {
      path: "/embedded.html#scheduling",
      selector: ".em-schedule-tree",
      stack: ".em-schedule-paths",
      desktopColumns: 2,
      arrowCount: 0,
      orders: [
        [".em-schedule-paths > article > span", ["Yes · candidate"]],
        [".em-schedule-paths > article > strong", ["Cyclic executive"]],
        [".em-schedule-paths > section > span", ["No · Gate 03"]],
        [".em-schedule-priority-choices > article > strong", ["Fixed priority + response-time analysis", "EDF + demand analysis"]]
      ],
      counts: [[".em-schedule-policy-question", 1], [".em-schedule-paths > article, .em-schedule-paths > section", 2], [".em-schedule-priority-choices > article", 2]]
    },
    {
      path: "/npu-acim.html#runtime",
      selector: ".acim-residency-machine",
      stack: ".acim-residency-states",
      desktopColumns: 5,
      arrowCount: 6,
      orders: [
        [".acim-residency-states > li > strong", ["EMPTY", "LOADING / PROGRAMMING", "VERIFYING", "READY", "EVICTING"]],
        [".acim-residency-outcomes > article > strong", ["Publish a valid READY record", "Publish UNKNOWN · dispatch forbidden"]]
      ],
      counts: [[".acim-residency-states > li", 5], [".acim-residency-cycle-return", 1], [".acim-residency-fault-steps > li", 3], [".acim-residency-outcomes > article", 2]]
    }
  ];

  for (const contract of contracts) {
    await page.setViewportSize({ width: 1280, height: 844 });
    await page.goto(`${origin}${contract.path}`);
    const diagram = page.locator(contract.selector);
    await expect(diagram).toHaveCount(1);
    await expect(diagram.locator("h3").first()).toBeVisible();
    await expect(diagram.locator("figcaption")).toHaveCount(1);
    for (const [selector, count] of contract.counts) {
      await expect(diagram.locator(selector)).toHaveCount(count);
    }
    for (const [selector, expectedLabels] of contract.orders) {
      const labels = await diagram.locator(selector).allTextContents();
      expect(labels.map(label => label.replace(/\s+/g, " ").trim())).toEqual(expectedLabels);
    }
    const desktopColumns = await diagram.locator(contract.stack).evaluate(element => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
    expect(desktopColumns).toBe(contract.desktopColumns);

    await page.setViewportSize({ width: 320, height: 844 });
    const overflow = await diagram.evaluate(element => ({
      self: element.scrollWidth - element.clientWidth,
      descendants: [...element.querySelectorAll("*")]
        .filter(child => getComputedStyle(child).overflowX === "visible")
        .reduce((largest, child) => Math.max(largest, child.scrollWidth - child.clientWidth), 0)
    }));
    expect(overflow.self).toBeLessThanOrEqual(1);
    expect(overflow.descendants).toBeLessThanOrEqual(1);
    const stackColumns = await diagram.locator(contract.stack).evaluate(element => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
    expect(stackColumns).toBe(1);

    const arrows = await diagram.locator(".concept-flow").evaluateAll(flows => flows.flatMap(flow => {
      const items = [...flow.children].filter(child => child.matches("li"));
      return items.slice(0, -1).map(item => getComputedStyle(item, "::after").content);
    }));
    expect(arrows).toHaveLength(contract.arrowCount);
    expect(arrows.every(arrow => arrow === '"↓"')).toBeTruthy();
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
  const lifecycleCheckpoints = ["Frame", "Quantify", "Model", "Design", "Stress", "Prove", "Transition", "Operate · evolve · retire", "Close"];
  await expect(panel.locator(".interview-checkpoints input")).toHaveCount(lifecycleCheckpoints.length);
  for (const checkpoint of lifecycleCheckpoints) {
    await expect(panel.getByRole("checkbox", { name: checkpoint, exact: true })).toBeVisible();
  }
  await panel.getByRole("checkbox", { name: "Frame", exact: true }).check();
  await panel.getByRole("checkbox", { name: "Transition", exact: true }).check();
  await panel.getByRole("checkbox", { name: "Operate · evolve · retire", exact: true }).check();
  await panel.getByText("Self-score the answer").click();
  await panel.getByLabel("Scope and requirements score").selectOption("2");
  await panel.getByLabel("Quantitative reasoning score").selectOption("2");
  await expect(panel.getByLabel("Evidence and lifecycle closure score")).toBeVisible();
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
