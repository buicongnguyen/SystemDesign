const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
const siteHeader = document.querySelector(".site-header");

function storedTheme() {
  try {
    const saved = localStorage.getItem("atlas-theme") || localStorage.getItem("dsa-theme");
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function preferredTheme() {
  return storedTheme() || (systemTheme.matches ? "light" : "dark");
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const targetTheme = nextTheme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  themeToggle?.setAttribute("aria-label", `Switch to ${targetTheme} theme`);
  themeToggle?.setAttribute("title", `Switch to ${targetTheme} theme`);
  themeColor?.setAttribute("content", nextTheme === "light" ? "#f5f8fc" : "#07111f");
}

applyTheme(preferredTheme());

themeToggle?.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  try {
    localStorage.setItem("atlas-theme", next);
  } catch {
    // The preference is optional; controls must still work when storage is blocked.
  }
});

systemTheme.addEventListener?.("change", event => {
  if (!storedTheme()) applyTheme(event.matches ? "light" : "dark");
});

const trackNav = document.querySelector('.site-header nav[aria-label="Track navigation"]');
const currentTrack = trackNav?.querySelector('[aria-current="page"]');
const topicNav = document.querySelector(".page-nav, .se-page-nav");
const mainContent = document.querySelector("main");
const pageFooter = document.querySelector("footer");
const BOOK_READING_PLACE_KEY = "system-design-atlas-reading-place-v1";
const BOOK_RESUME_INTENT_KEY = "system-design-atlas-resume-intent-v1";
const BOOK_DESKTOP_QUERY = "(min-width: 76.25em)";
const bookDesktopMedia = window.matchMedia(BOOK_DESKTOP_QUERY);

const BOOK_CHAPTER_GROUPS = [
  {
    label: "Start here",
    chapters: [
      {
        number: "0",
        href: "index.html",
        title: "System Design Atlas",
        shortTitle: "Atlas",
        sections: [
          ["top", "Overview"],
          ["tracks", "01 · Choose a design track"],
          ["shared-core", "02 · Shared evidence loop"],
          ["selector", "03 · Boundary decision map"],
          ["cross-track-case", "04 · Cross-track mission"],
          ["practice", "05 · Practice matrix"]
        ]
      }
    ]
  },
  {
    label: "System-scale design",
    chapters: [
      {
        number: "1",
        href: "backend.html",
        title: "Backend & Distributed Systems",
        shortTitle: "Backend",
        sections: [
          ["top", "Overview"],
          ["request", "01 · Request journey"],
          ["scale", "02 · Scaling ladder"],
          ["decisions", "03 · Architecture decision graph"],
          ["data-decisions", "04 · Data decision matrix"],
          ["distributed-tradeoffs", "05 · Distributed trade-offs"],
          ["fast-slow-paths", "06 · Fast and slow paths"],
          ["reliability", "07 · Reliability stack"],
          ["interview", "08 · Interview loop"],
          ["thinking-flow", "09 · System-design reasoning"],
          ["workbench", "10 · Quantitative workbench"],
          ["practice", "11 · Interview practice"],
          ["resources", "12 · Study path"]
        ]
      },
      {
        number: "2",
        href: "systems-engineering.html",
        title: "Systems Engineering",
        shortTitle: "Systems engineering",
        sections: [
          ["top", "Overview"],
          ["context", "01 · System context"],
          ["conops", "02 · Concept of Operations"],
          ["process", "03 · Requirements and decomposition"],
          ["allocation", "04 · Logical-to-physical allocation"],
          ["interfaces", "05 · Interface contracts"],
          ["budgets", "06 · Technical budgets"],
          ["trades", "07 · Trade studies"],
          ["risk", "08 · Risk, FMEA, and fault trees"],
          ["integration", "09 · Integration and V-model"],
          ["verification", "10 · Verification and validation"],
          ["evidence-package", "11 · Evidence package"],
          ["practice", "12 · Interview practice"],
          ["resources", "13 · Foundations"]
        ]
      }
    ]
  },
  {
    label: "Physical computing",
    chapters: [
      {
        number: "3",
        href: "hardware.html",
        title: "Hardware Architecture",
        shortTitle: "Hardware",
        sections: [
          ["top", "Overview"],
          ["thinking", "01 · Workload-to-architecture flow"],
          ["metrics", "02 · Performance contract"],
          ["constraints", "03 · Physical trade-off compass"],
          ["memory", "04 · Memory hierarchy"],
          ["compute", "05 · Compute and dataflow choices"],
          ["fabric", "06 · Interconnect and I/O"],
          ["physical", "07 · Power, thermal, and reliability"],
          ["bottlenecks", "08 · Bottleneck selector"],
          ["sizing-workbench", "09 · Quantitative sizing"],
          ["lifecycle", "10 · Bring-up and release"],
          ["practice", "11 · Interview practice"],
          ["resources", "12 · References"]
        ]
      },
      {
        number: "4",
        href: "embedded.html",
        title: "Embedded & Cyber-Physical Systems",
        shortTitle: "Embedded",
        sections: [
          ["top", "Overview"],
          ["loop", "01 · Cyber-physical loop"],
          ["partition", "02 · Hardware/software partition"],
          ["scheduling", "03 · Real-time scheduling"],
          ["interrupts", "04 · Interrupt and DMA ownership"],
          ["modes", "05 · State and power modes"],
          ["protocols", "06 · Protocol selection"],
          ["safety", "07 · Safety and recovery"],
          ["verification", "08 · Verification ladder"],
          ["timing-workbench", "09 · Timing workbench"],
          ["practice", "10 · Interview practice"],
          ["resources", "11 · References"]
        ]
      }
    ]
  },
  {
    label: "Accelerator co-design",
    chapters: [
      {
        number: "5",
        href: "npu-acim.html",
        title: "NPU + ACiM Software Stack",
        shortTitle: "NPU + ACiM",
        sections: [
          ["top", "Overview"],
          ["boundary", "01 · System boundary"],
          ["stack", "02 · Model-to-device stack"],
          ["decision", "03 · Placement and compiler decisions"],
          ["mapping", "04 · Mapping and scheduling"],
          ["artifacts", "05 · Versioned artifacts"],
          ["runtime", "06 · Runtime, driver, and firmware"],
          ["feedback", "07 · Calibration loop"],
          ["bottlenecks", "08 · Bottleneck matrix"],
          ["compiler-workbench", "09 · Compiler/runtime workbench"],
          ["practice", "10 · Interview practice"],
          ["sources", "11 · Sources"]
        ]
      }
    ]
  }
];

const BOOK_CHAPTERS = BOOK_CHAPTER_GROUPS.flatMap(group => group.chapters);
const currentBookFile = (() => {
  const tail = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) || "");
  return tail.endsWith(".html") ? tail : "index.html";
})();
const currentBookChapter = BOOK_CHAPTERS.find(chapter => chapter.href === currentBookFile);
const currentBookChapterIndex = currentBookChapter ? BOOK_CHAPTERS.indexOf(currentBookChapter) : -1;
let bookSidebar = null;
let bookContents = null;
let bookNavToggle = null;
let bookResumeLink = null;
let bookSaveButton = null;
let bookSaveStatus = null;
let bookLocationSection = null;
let bookProgress = null;
let bookShell = null;
let activeBookSectionId = null;
let bookSectionElements = [];
let bookSectionLinks = [];
let bookDrawerOpen = false;
let bookLocationFrame = 0;
let pendingBookHashTarget = location.hash.slice(1);
let pendingBookResumePlace = null;
let bookSectionReadingProgress = 0;
let hasBookSectionReadingProgress = false;
let bookSectionLeadInClearance = null;

function chapterGroupsMarkup() {
  return BOOK_CHAPTER_GROUPS.map(group => `
    <section class="book-nav-group">
      <h2>${group.label}</h2>
      <ol>
        ${group.chapters.map(chapter => {
          const current = chapter.href === currentBookFile;
          const sectionMarkup = current
            ? `<ol class="book-section-list" aria-label="${chapter.title} contents">
                ${chapter.sections.map(([id, label]) => `
                  <li><a class="book-section-link" href="#${id}" data-book-section="${id}">${label}</a></li>
                `).join("")}
              </ol>`
            : "";
          return `
            <li class="book-chapter-item${current ? " is-current" : ""}">
              <a class="book-chapter-link" href="${chapter.href}"${current ? ' aria-current="page"' : ""}>
                <span>Chapter ${chapter.number}</span>
                <strong>${chapter.title}</strong>
                ${current ? '<em class="book-current-bookmark" aria-hidden="true">Here</em>' : ""}
              </a>
              ${sectionMarkup}
            </li>
          `;
        }).join("")}
      </ol>
    </section>
  `).join("");
}

function chapterPaginationMarkup() {
  if (!currentBookChapter) return "";
  const index = BOOK_CHAPTERS.indexOf(currentBookChapter);
  const previous = BOOK_CHAPTERS[index - 1];
  const next = BOOK_CHAPTERS[index + 1];
  const link = (chapter, direction) => chapter
    ? `<a class="book-pagination-${direction}" href="${chapter.href}">
        <span>${direction === "previous" ? "← Previous chapter" : "Next chapter →"}</span>
        <strong>Chapter ${chapter.number} · ${chapter.title}</strong>
      </a>`
    : "";
  return `
    <nav class="book-chapter-pagination" aria-label="Chapter navigation">
      ${link(previous, "previous")}
      ${link(next, "next")}
    </nav>
  `;
}

function setBookBackgroundInert(inert) {
  if (bookShell) bookShell.inert = inert;
  if (bookProgress) bookProgress.inert = inert;
  if (siteHeader) {
    siteHeader.inert = false;
    for (const child of siteHeader.children) {
      child.inert = inert && child !== bookNavToggle;
    }
  }
  const skipLink = document.querySelector(".skip-link");
  if (skipLink) skipLink.inert = inert;
}

function setBookDrawerState(open, { restoreFocus = true } = {}) {
  if (!bookSidebar || !bookNavToggle || bookDesktopMedia.matches) return;
  if (open && !bookDrawerOpen) {
    document.dispatchEvent(new Event("atlas:book-drawer-opening"));
  }
  bookDrawerOpen = open;
  document.body.classList.toggle("book-nav-open", open);
  bookNavToggle.setAttribute("aria-expanded", String(open));
  bookNavToggle.setAttribute("aria-label", open ? "Close book contents" : "Open book contents");
  bookSidebar.setAttribute("aria-hidden", String(!open));
  bookSidebar.inert = !open;
  setBookBackgroundInert(open);
  if (open) {
    if (activeBookSectionId && hasBookSectionReadingProgress) {
      positionBookReadingProgress(
        activeBookSectionId,
        bookSectionReadingProgress,
        bookSectionLeadInClearance
      );
    }
    requestAnimationFrame(() => {
      const current = bookSidebar.querySelector('.book-section-link[aria-current="location"]')
        || bookSidebar.querySelector('.book-chapter-link[aria-current="page"]');
      (current || bookSidebar.querySelector(".book-sidebar-close"))?.focus({ preventScroll: true });
      revealBookSection(current);
    });
  } else if (restoreFocus) {
    bookNavToggle.focus({ preventScroll: true });
  }
}

function closeBookDrawer(options) {
  setBookDrawerState(false, options);
}

function syncBookDrawerMode(event) {
  if (!bookSidebar || !bookNavToggle) return;
  const preservedSection = event?.type === "change" ? activeBookSectionId : null;
  const preservedProgress = hasBookSectionReadingProgress ? bookSectionReadingProgress : 0;
  const preservedLeadInClearance = bookSectionLeadInClearance;
  const drawerWasOpen = bookDrawerOpen;
  const focusWasInSidebar = bookSidebar.contains(document.activeElement);
  if (bookDesktopMedia.matches) {
    bookDrawerOpen = false;
    document.body.classList.remove("book-nav-open");
    setBookBackgroundInert(false);
    bookSidebar.removeAttribute("aria-hidden");
    bookSidebar.removeAttribute("role");
    bookSidebar.removeAttribute("aria-modal");
    bookSidebar.inert = false;
    bookNavToggle.setAttribute("aria-expanded", "false");
    bookNavToggle.setAttribute("aria-label", "Open book contents");
    if (drawerWasOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const current = bookSidebar.querySelector('.book-section-link[aria-current="location"], .book-chapter-link[aria-current="page"]');
        current?.focus({ preventScroll: true });
      }));
    }
  } else {
    bookSidebar.setAttribute("role", "dialog");
    bookSidebar.setAttribute("aria-modal", "true");
    bookSidebar.setAttribute("aria-hidden", String(!bookDrawerOpen));
    bookSidebar.inert = !bookDrawerOpen;
    if (!bookDrawerOpen && focusWasInSidebar) {
      requestAnimationFrame(() => requestAnimationFrame(() => bookNavToggle.focus({ preventScroll: true })));
    }
  }
  if (preservedSection) {
    positionBookReadingProgress(preservedSection, preservedProgress, preservedLeadInClearance);
  }
}

function readStoredBookPlace() {
  try {
    const value = JSON.parse(localStorage.getItem(BOOK_READING_PLACE_KEY) || "null");
    const chapter = value && BOOK_CHAPTERS.find(candidate => candidate.href === value.path);
    const sectionExists = chapter?.sections.some(([id]) => `#${id}` === value.hash);
    if (!chapter || !sectionExists) return null;
    value.y = Number.isFinite(Number(value.y)) ? Math.max(0, Number(value.y)) : null;
    value.sectionOffset = Number.isFinite(Number(value.sectionOffset))
      ? Number(value.sectionOffset)
      : null;
    value.sectionProgress = Number.isFinite(Number(value.sectionProgress))
      ? Math.max(-1, Math.min(1, Number(value.sectionProgress)))
      : null;
    return value;
  } catch {
    return null;
  }
}

function readBookResumeIntent() {
  try {
    const value = JSON.parse(sessionStorage.getItem(BOOK_RESUME_INTENT_KEY) || "null");
    if (!value || value.path !== currentBookFile || !Number.isFinite(Number(value.y))) return null;
    const chapter = BOOK_CHAPTERS.find(candidate => candidate.href === value.path);
    if (!chapter?.sections.some(([id]) => `#${id}` === value.hash)) return null;
    return { ...value, y: Math.max(0, Number(value.y)) };
  } catch {
    return null;
  }
}

function writeBookResumeIntent(place) {
  try {
    sessionStorage.setItem(BOOK_RESUME_INTENT_KEY, JSON.stringify(place));
  } catch {
    // The section hash remains a safe fallback when session storage is blocked.
  }
}

function clearBookResumeIntent() {
  try {
    sessionStorage.removeItem(BOOK_RESUME_INTENT_KEY);
  } catch {
    // A stale optional intent is harmless and will only match its target chapter.
  }
}

function renderStoredBookPlace(place = readStoredBookPlace()) {
  if (!bookResumeLink) return;
  const chapter = place && BOOK_CHAPTERS.find(candidate => candidate.href === place.path);
  const section = chapter?.sections.find(([id]) => `#${id}` === place.hash);
  if (!chapter || !section) {
    bookResumeLink.removeAttribute("href");
    bookResumeLink.setAttribute("aria-disabled", "true");
    bookResumeLink.querySelector("strong").textContent = "No saved place yet";
    bookResumeLink.querySelector("small").textContent = "Save the section you want to revisit.";
    return;
  }
  bookResumeLink.href = `${place.path}${place.hash}`;
  bookResumeLink.removeAttribute("aria-disabled");
  bookResumeLink.querySelector("strong").textContent = `Chapter ${chapter.number} · ${chapter.shortTitle}`;
  bookResumeLink.querySelector("small").textContent = section[1];
}

function saveCurrentBookPlace() {
  if (!currentBookChapter || !activeBookSectionId) return;
  const section = currentBookChapter.sections.find(([id]) => id === activeBookSectionId);
  if (!section) return;
  const sectionElement = document.getElementById(section[0]);
  const sectionBox = sectionElement?.getBoundingClientRect();
  const sectionTop = sectionBox ? sectionBox.top + window.scrollY : window.scrollY;
  const sectionOffset = window.scrollY - sectionTop;
  const sectionProgress = sectionBox?.height
    ? Math.max(-1, Math.min(1, sectionOffset / sectionBox.height))
    : 0;
  const place = {
    path: currentBookChapter.href,
    hash: `#${section[0]}`,
    y: Math.round(window.scrollY),
    sectionOffset: Math.round(sectionOffset),
    sectionProgress,
    viewportWidth: window.innerWidth,
    title: currentBookChapter.title,
    section: section[1]
  };
  try {
    localStorage.setItem(BOOK_READING_PLACE_KEY, JSON.stringify(place));
  } catch {
    return;
  }
  if (bookSaveButton) bookSaveButton.querySelector("span:last-child").textContent = `Saved · ${section[1]}`;
  if (bookSaveStatus) {
    bookSaveStatus.textContent = `Saved your place at Chapter ${currentBookChapter.number}, ${section[1]}.`;
  }
  renderStoredBookPlace(place);
}

function revealBookSection(link) {
  if (!bookSidebar || !bookContents || !link || (!bookDesktopMedia.matches && !bookDrawerOpen)) return;
  const sidebarRect = bookContents.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const upperEdge = sidebarRect.top + 24;
  const lowerEdge = sidebarRect.bottom - 24;
  if (linkRect.top < upperEdge) bookContents.scrollTop += linkRect.top - upperEdge;
  else if (linkRect.bottom > lowerEdge) bookContents.scrollTop += linkRect.bottom - lowerEdge;
}

function currentSectionFromScroll() {
  if (!bookSectionElements.length) return null;
  const sectionLeadIn = Math.min(128, Math.max(56, window.innerHeight * .16));
  const readingLine = (siteHeader?.getBoundingClientRect().bottom || 0) + sectionLeadIn;
  let active = bookSectionElements[0];
  for (const section of bookSectionElements) {
    if (section.getBoundingClientRect().top <= readingLine) active = section;
    else break;
  }
  const maximumScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maximumScroll > 0 && window.scrollY >= maximumScroll - 2) {
    active = bookSectionElements.at(-1);
  }
  return active?.id || null;
}

function syncBookReadingLocation() {
  if (!currentBookChapter || !bookSectionLinks.length) return;
  const pendingSection = currentBookChapter.sections.some(([id]) => id === pendingBookHashTarget)
    ? pendingBookHashTarget
    : null;
  pendingBookHashTarget = null;
  const sectionId = pendingSection
    || currentSectionFromScroll()
    || currentBookChapter.sections[0][0];
  const sectionEntry = currentBookChapter.sections.find(([id]) => id === sectionId)
    || currentBookChapter.sections[0];
  const nextId = sectionEntry[0];

  for (const link of bookSectionLinks) {
    if (link.dataset.bookSection === nextId) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  if (topicNav) {
    for (const link of topicNav.querySelectorAll('a[href^="#"]')) {
      if (link.hash === `#${nextId}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
  if (bookLocationSection) bookLocationSection.textContent = sectionEntry[1];
  if (activeBookSectionId !== nextId) {
    activeBookSectionId = nextId;
    revealBookSection(bookSectionLinks.find(link => link.dataset.bookSection === nextId));
  }
  if (!hasBookSectionReadingProgress) rememberBookSectionReadingProgress();

  if (bookProgress) {
    const maximumScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percentage = Math.max(0, Math.min(100, (window.scrollY / maximumScroll) * 100));
    bookProgress.style.setProperty("--book-progress", `${percentage}%`);
    bookProgress.setAttribute("aria-valuenow", String(Math.round(percentage)));
  }
}

function scheduleBookLocationSync() {
  cancelAnimationFrame(bookLocationFrame);
  bookLocationFrame = requestAnimationFrame(syncBookReadingLocation);
}

function rememberBookSectionReadingProgress() {
  const section = activeBookSectionId && document.getElementById(activeBookSectionId);
  if (!section) return;
  const sectionBox = section.getBoundingClientRect();
  const sectionTop = sectionBox.top + window.scrollY;
  const sectionOffset = window.scrollY - sectionTop;
  bookSectionReadingProgress = sectionBox.height
    ? Math.max(-1, Math.min(1, sectionOffset / sectionBox.height))
    : 0;
  bookSectionLeadInClearance = sectionBox.top >= 0
    ? sectionBox.top - (siteHeader?.getBoundingClientRect().bottom || 0)
    : null;
  hasBookSectionReadingProgress = true;
}

function positionBookReadingProgress(id, progress, leadInClearance = null) {
  const target = document.getElementById(id);
  if (!target) return;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  const targetBox = target.getBoundingClientRect();
  const targetTop = targetBox.top + window.scrollY;
  const headerHeight = siteHeader?.getBoundingClientRect().height || 0;
  const targetOffset = Number.isFinite(leadInClearance)
    ? -(headerHeight + leadInClearance)
    : targetBox.height * progress;
  const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo(0, Math.min(Math.max(0, targetTop + targetOffset), maximumScroll));
  root.style.scrollBehavior = previousScrollBehavior;
  rememberBookSectionReadingProgress();
  scheduleBookLocationSync();
}

function positionBookSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  pendingBookHashTarget = id;
  requestAnimationFrame(() => {
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const headerHeight = siteHeader?.getBoundingClientRect().height || 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, targetTop - headerHeight - 16));
    root.style.scrollBehavior = previousScrollBehavior;
    scheduleBookLocationSync();
  });
}

function positionBookSavedPlace(place) {
  if (!place) return;
  const id = place.hash?.slice(1);
  const target = id && document.getElementById(id);
  if (!target) return;
  const hasProgress = Number.isFinite(place.sectionProgress);
  const hasOffset = Number.isFinite(place.sectionOffset);
  if (!hasProgress && !hasOffset) {
    positionBookSection(id);
    return;
  }
  pendingBookHashTarget = id;
  requestAnimationFrame(() => {
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const targetBox = target.getBoundingClientRect();
    const targetTop = targetBox.top + window.scrollY;
    const sameLayoutWidth = Number.isFinite(Number(place.viewportWidth))
      && Math.abs(window.innerWidth - Number(place.viewportWidth)) <= 1;
    const targetOffset = sameLayoutWidth && hasOffset
      ? place.sectionOffset
      : hasProgress
        ? targetBox.height * place.sectionProgress
        : Math.max(-window.innerHeight, Math.min(place.sectionOffset, targetBox.height));
    const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(Math.max(0, targetTop + targetOffset), maximumScroll));
    root.style.scrollBehavior = previousScrollBehavior;
    scheduleBookLocationSync();
  });
}

function alignBookHashTarget() {
  const id = location.hash.slice(1);
  if (!id || !currentBookChapter?.sections.some(([sectionId]) => sectionId === id)) {
    scheduleBookLocationSync();
    return;
  }
  positionBookSection(id);
}

function initializeBookNavigation() {
  if (!siteHeader || !mainContent || !currentBookChapter) return;
  const managesInitialScroll = currentBookChapter.sections.some(([id]) => `#${id}` === location.hash);
  const previousScrollRestoration = "scrollRestoration" in history ? history.scrollRestoration : null;
  if (managesInitialScroll) history.scrollRestoration = "manual";

  bookNavToggle = document.createElement("button");
  bookNavToggle.type = "button";
  bookNavToggle.className = "book-nav-toggle";
  bookNavToggle.setAttribute("aria-controls", "book-sidebar");
  bookNavToggle.setAttribute("aria-expanded", "false");
  bookNavToggle.setAttribute("aria-label", "Open book contents");
  bookNavToggle.innerHTML = '<span aria-hidden="true">☰</span><span>Contents</span>';
  siteHeader.insertBefore(bookNavToggle, themeToggle);

  bookSidebar = document.createElement("aside");
  bookSidebar.id = "book-sidebar";
  bookSidebar.className = "book-sidebar";
  bookSidebar.innerHTML = `
    <header class="book-sidebar-header">
      <div>
        <span>Book contents</span>
        <strong id="book-sidebar-title">System Design Atlas</strong>
        <small>6 chapters · 5 design tracks · interview practice</small>
      </div>
      <button class="book-sidebar-close" type="button" aria-label="Close book contents">×</button>
    </header>
    <section class="book-reader-tools" aria-label="Reading tools">
      <div class="book-location">
        <span>Reading now · Chapter ${currentBookChapterIndex + 1} of ${BOOK_CHAPTERS.length}</span>
        <strong>Chapter ${currentBookChapter.number} · ${currentBookChapter.shortTitle}</strong>
        <small id="book-location-section">Overview</small>
      </div>
      <button class="book-save-place" type="button">
        <span aria-hidden="true">⌑</span>
        <span>Save current place</span>
      </button>
      <p class="book-save-status sr-only" role="status" aria-live="polite"></p>
      <a class="book-resume-place" aria-disabled="true">
        <span>Resume reading</span>
        <strong>No saved place yet</strong>
        <small>Save the section you want to revisit.</small>
      </a>
      <div class="book-reader-actions"></div>
    </section>
    <nav class="book-contents" aria-label="Book contents">
      ${chapterGroupsMarkup()}
    </nav>
  `;
  bookSidebar.setAttribute("aria-labelledby", "book-sidebar-title");

  const backdrop = document.createElement("div");
  backdrop.className = "book-nav-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  siteHeader.after(bookSidebar, backdrop);

  bookShell = document.createElement("div");
  bookShell.className = "book-page-shell";
  mainContent.before(bookShell);
  bookShell.append(mainContent);
  if (pageFooter) bookShell.append(pageFooter);

  const pagination = chapterPaginationMarkup();
  if (pagination) mainContent.insertAdjacentHTML("beforeend", pagination);

  bookProgress = document.createElement("div");
  bookProgress.className = "book-reading-progress";
  bookProgress.setAttribute("role", "progressbar");
  bookProgress.setAttribute("aria-label", "Chapter reading progress");
  bookProgress.setAttribute("aria-valuemin", "0");
  bookProgress.setAttribute("aria-valuemax", "100");
  bookProgress.setAttribute("aria-valuenow", "0");
  document.body.append(bookProgress);

  bookResumeLink = bookSidebar.querySelector(".book-resume-place");
  bookSaveButton = bookSidebar.querySelector(".book-save-place");
  bookSaveStatus = bookSidebar.querySelector(".book-save-status");
  bookLocationSection = bookSidebar.querySelector("#book-location-section");
  bookContents = bookSidebar.querySelector(".book-contents");
  bookSectionLinks = [...bookSidebar.querySelectorAll("[data-book-section]")];
  bookSectionElements = currentBookChapter.sections
    .map(([id]) => document.getElementById(id))
    .filter(Boolean);

  root.classList.add("book-navigation-ready");
  renderStoredBookPlace();
  syncBookDrawerMode();
  pendingBookResumePlace = readBookResumeIntent();
  const initialBookResumePlace = pendingBookResumePlace;
  if (initialBookResumePlace) positionBookSavedPlace(initialBookResumePlace);
  else alignBookHashTarget();

  bookNavToggle.addEventListener("click", () => {
    if (bookDrawerOpen) closeBookDrawer();
    else setBookDrawerState(true);
  });
  bookSidebar.querySelector(".book-sidebar-close")?.addEventListener("click", () => closeBookDrawer());
  backdrop.addEventListener("click", () => closeBookDrawer());
  bookSaveButton?.addEventListener("click", saveCurrentBookPlace);
  bookResumeLink?.addEventListener("click", event => {
    if (bookResumeLink.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const place = readStoredBookPlace();
    if (!place) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (place.path !== currentBookFile) {
      writeBookResumeIntent(place);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    history.pushState(null, "", place.hash);
    positionBookSavedPlace(place);
    closeBookDrawer();
  });
  bookSidebar.addEventListener("click", event => {
    const anchor = event.target.closest("a");
    if (!anchor || bookDesktopMedia.matches) return;
    if (anchor.matches(".book-section-link")) {
      const id = anchor.dataset.bookSection;
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      history.pushState(null, "", `#${id}`);
      positionBookSection(id);
    }
    closeBookDrawer();
  });

  document.addEventListener("keydown", event => {
    if (!bookDrawerOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeBookDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...bookSidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.inert && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!bookSidebar.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  });

  bookDesktopMedia.addEventListener?.("change", syncBookDrawerMode);
  window.addEventListener("scroll", () => {
    scheduleBookLocationSync();
    requestAnimationFrame(rememberBookSectionReadingProgress);
  }, { passive: true });
  window.addEventListener("hashchange", alignBookHashTarget);
  window.addEventListener("load", () => {
    if (pendingBookResumePlace) {
      positionBookSavedPlace(pendingBookResumePlace);
      pendingBookResumePlace = null;
      clearBookResumeIntent();
    } else {
      alignBookHashTarget();
    }
  }, { once: true });
  window.addEventListener("pageshow", () => {
    if (initialBookResumePlace) positionBookSavedPlace(initialBookResumePlace);
    else alignBookHashTarget();
    if (managesInitialScroll && previousScrollRestoration) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        history.scrollRestoration = previousScrollRestoration;
      }));
    }
  }, { once: true });
}

initializeBookNavigation();

function syncStickyHeaderOffset() {
  if (!siteHeader) return;
  root.style.setProperty("--site-header-height", `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
}

function revealNavLink(nav, link) {
  if (!nav || !link) return;
  if (nav.scrollWidth <= nav.clientWidth) {
    nav.scrollTo({ left: 0, behavior: "auto" });
    return;
  }
  const navRect = nav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const linkCenterInContent = linkRect.left - navRect.left + nav.scrollLeft + linkRect.width / 2;
  nav.scrollTo({ left: Math.max(0, linkCenterInContent - nav.clientWidth / 2), behavior: "auto" });
}

function revealCurrentTrack() {
  revealNavLink(trackNav, currentTrack);
}

function syncTopicNavigation() {
  syncBookReadingLocation();
}

let layoutFrame;
function scheduleLayoutSync() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    syncStickyHeaderOffset();
    revealCurrentTrack();
    syncTopicNavigation();
  });
}

scheduleLayoutSync();
window.addEventListener("resize", scheduleLayoutSync, { passive: true });
window.addEventListener("orientationchange", scheduleLayoutSync, { passive: true });
window.addEventListener("hashchange", scheduleLayoutSync);
topicNav?.addEventListener("click", scheduleLayoutSync);

if (typeof ResizeObserver === "function") {
  const layoutObserver = new ResizeObserver(scheduleLayoutSync);
  if (siteHeader) layoutObserver.observe(siteHeader);
  if (trackNav) layoutObserver.observe(trackNav);
  if (topicNav) layoutObserver.observe(topicNav);
  if (mainContent) layoutObserver.observe(mainContent);
}

const practiceSection = document.querySelector("#practice");

function initializeInterviewMode() {
  const interviewHost = bookSidebar?.querySelector(".book-reader-actions") || topicNav;
  if (!interviewHost || !practiceSection) return;

  const configuredMinutes = Number.parseInt(practiceSection.dataset.interviewMinutes || "", 10);
  const sessionMinutes = Number.isInteger(configuredMinutes) && configuredMinutes >= 10 && configuredMinutes <= 120
    ? configuredMinutes
    : 45;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "interview-mode-trigger";
  trigger.setAttribute("aria-controls", "interview-mode-panel");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = "<span aria-hidden=\"true\">◷</span> Interview mode";
  interviewHost.append(trigger);

  const panel = document.createElement("aside");
  panel.id = "interview-mode-panel";
  panel.className = "interview-mode-panel";
  panel.hidden = true;
  panel.setAttribute("aria-labelledby", "interview-mode-title");
  panel.innerHTML = `
    <header>
      <div>
        <span>${sessionMinutes}-minute practice</span>
        <h2 id="interview-mode-title">Interview mode</h2>
      </div>
      <button class="interview-panel-close" type="button" aria-label="Close interview controls">×</button>
    </header>
    <div class="interview-timer" role="timer" aria-label="Interview time remaining">
      <strong>${String(sessionMinutes).padStart(2, "0")}:00</strong>
      <span>remaining</span>
    </div>
    <div class="interview-actions">
      <button type="button" data-timer-action="toggle">Start timer</button>
      <button type="button" data-timer-action="reset">Reset</button>
      <a href="#practice">Go to practice</a>
    </div>
    <label class="interview-coaching-toggle">
      <input type="checkbox" checked>
      <span><b>Hide coaching notes</b><small>Reveal them only after you commit to an answer.</small></span>
    </label>
    <fieldset class="interview-checkpoints">
      <legend>Thinking checkpoints</legend>
      <label><input type="checkbox"><span>Frame</span></label>
      <label><input type="checkbox"><span>Quantify</span></label>
      <label><input type="checkbox"><span>Model</span></label>
      <label><input type="checkbox"><span>Design</span></label>
      <label><input type="checkbox"><span>Stress</span></label>
      <label><input type="checkbox"><span>Prove</span></label>
      <label><input type="checkbox"><span>Transition</span></label>
      <label><input type="checkbox"><span>Operate · evolve · retire</span></label>
      <label><input type="checkbox"><span>Close</span></label>
    </fieldset>
    <details class="interview-rubric">
      <summary>Self-score the answer</summary>
      <div>
        <label><span>Scope + requirements</span><select aria-label="Scope and requirements score"><option value="0">0 · Missing</option><option value="1">1 · Partial</option><option value="2">2 · Strong</option></select></label>
        <label><span>Quantitative reasoning</span><select aria-label="Quantitative reasoning score"><option value="0">0 · Missing</option><option value="1">1 · Partial</option><option value="2">2 · Strong</option></select></label>
        <label><span>Architecture + interfaces</span><select aria-label="Architecture and interfaces score"><option value="0">0 · Missing</option><option value="1">1 · Partial</option><option value="2">2 · Strong</option></select></label>
        <label><span>Failures + trade-offs</span><select aria-label="Failures and trade-offs score"><option value="0">0 · Missing</option><option value="1">1 · Partial</option><option value="2">2 · Strong</option></select></label>
        <label><span>Evidence + lifecycle closure</span><select aria-label="Evidence and lifecycle closure score"><option value="0">0 · Missing</option><option value="1">1 · Partial</option><option value="2">2 · Strong</option></select></label>
        <output aria-live="polite">0/10 · Build the first complete pass.</output>
      </div>
    </details>
    <p class="interview-status" aria-live="polite"></p>
    <button class="interview-end" type="button">End session</button>
  `;
  document.body.append(panel);

  const closeButton = panel.querySelector(".interview-panel-close");
  const timer = panel.querySelector(".interview-timer strong");
  const timerToggle = panel.querySelector('[data-timer-action="toggle"]');
  const timerReset = panel.querySelector('[data-timer-action="reset"]');
  const coachingToggle = panel.querySelector(".interview-coaching-toggle input");
  const checkpointInputs = [...panel.querySelectorAll(".interview-checkpoints input")];
  const rubricScores = [...panel.querySelectorAll(".interview-rubric select")];
  const rubricOutput = panel.querySelector(".interview-rubric output");
  const status = panel.querySelector(".interview-status");
  const endButton = panel.querySelector(".interview-end");
  const coachingDetails = [...practiceSection.querySelectorAll("details")];
  const sessionSeconds = sessionMinutes * 60;
  let secondsRemaining = sessionSeconds;
  let timerId = null;
  let timerDeadline = 0;
  let returnFocusToBookToggle = false;

  function timerText(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function renderTimer() {
    timer.textContent = timerText(secondsRemaining);
    panel.classList.toggle("interview-time-expired", secondsRemaining === 0);
  }

  function stopTimer() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
  }

  function tickTimer() {
    secondsRemaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
    renderTimer();
    if (secondsRemaining > 0) return;
    stopTimer();
    timerToggle.textContent = "Restart timer";
    status.textContent = "Time is up. Finish with the bottleneck, trade-off, and evidence plan.";
  }

  function resetTimer() {
    stopTimer();
    secondsRemaining = sessionSeconds;
    timerToggle.textContent = "Start timer";
    status.textContent = "";
    renderTimer();
  }

  function openPanel() {
    returnFocusToBookToggle = !bookDesktopMedia.matches && bookDrawerOpen;
    if (returnFocusToBookToggle) closeBookDrawer({ restoreFocus: false });
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("interview-session-active");
    if (coachingToggle.checked) document.body.classList.add("interview-coaching-hidden");
    for (const detail of coachingDetails) detail.open = false;
    closeButton.focus();
  }

  function closePanel({ restoreFocus = true } = {}) {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) (returnFocusToBookToggle ? bookNavToggle : trigger)?.focus();
    returnFocusToBookToggle = false;
  }

  document.addEventListener("atlas:book-drawer-opening", () => {
    if (!panel.hidden) closePanel({ restoreFocus: false });
  });

  function updateRubric() {
    const score = rubricScores.reduce((total, select) => total + Number(select.value), 0);
    const guidance = score >= 8
      ? "Strong structure; sharpen the weakest evidence."
      : score >= 5
        ? "Solid pass; close the missing contracts."
        : "Build the first complete pass.";
    rubricOutput.textContent = `${score}/10 · ${guidance}`;
  }

  function endSession() {
    resetTimer();
    for (const input of checkpointInputs) input.checked = false;
    for (const select of rubricScores) select.value = "0";
    updateRubric();
    coachingToggle.checked = true;
    document.body.classList.remove("interview-session-active", "interview-coaching-hidden");
    closePanel();
  }

  trigger.addEventListener("click", () => panel.hidden ? openPanel() : closePanel());
  closeButton.addEventListener("click", () => closePanel());
  timerToggle.addEventListener("click", () => {
    if (timerId) {
      tickTimer();
      stopTimer();
      timerToggle.textContent = "Resume timer";
      status.textContent = "Timer paused.";
      return;
    }
    if (secondsRemaining === 0) secondsRemaining = sessionSeconds;
    timerDeadline = Date.now() + secondsRemaining * 1000;
    timerId = setInterval(tickTimer, 250);
    timerToggle.textContent = "Pause timer";
    status.textContent = "Timer running.";
    tickTimer();
  });
  timerReset.addEventListener("click", resetTimer);
  coachingToggle.addEventListener("change", () => {
    document.body.classList.toggle("interview-coaching-hidden", coachingToggle.checked);
    if (coachingToggle.checked) for (const detail of coachingDetails) detail.open = false;
  });
  for (const select of rubricScores) select.addEventListener("change", updateRubric);
  endButton.addEventListener("click", endSession);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && timerId) tickTimer();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) closePanel();
  });

  renderTimer();
}

const zoomableSelectors = [
  ".replication-diagram",
  ".cap-layout",
  ".master-design-flow",
  ".se-context-map",
  ".se-allocation-map",
  ".se-v-model",
  ".hw-roofline",
  ".hw-system-map",
  ".hw-diagnose-flow",
  ".hw-case-flow",
  ".em-control-board",
  ".em-integration-board",
  ".em-control-analysis-grid",
  ".em-control-verdict",
  ".em-irq-board",
  ".em-safety-map",
  ".acim-hybrid-flow",
  ".acim-lifecycle-board",
  ".acim-integration-board",
  ".acim-tile-map",
  ".acim-runtime-flow",
  ".acim-control-loop",
  ".acim-interview-flow",
  ".atlas-cross-track-map"
];

function initializeDiagramControls() {
  const diagrams = [...document.querySelectorAll(zoomableSelectors.join(","))];
  let expandedDiagram = null;
  let restoreButton = null;

  function closeExpandedDiagram() {
    if (!expandedDiagram) return;
    expandedDiagram.classList.remove("is-expanded");
    expandedDiagram.style.removeProperty("--diagram-zoom");
    expandedDiagram.dataset.zoomLevel = "1";
    document.body.classList.remove("diagram-expanded");
    const expandButton = expandedDiagram.querySelector('[data-diagram-action="expand"]');
    expandButton?.setAttribute("aria-label", `Expand ${expandedDiagram.dataset.diagramLabel || "diagram"}`);
    expandButton?.setAttribute("aria-pressed", "false");
    expandedDiagram = null;
    restoreButton?.focus();
    restoreButton = null;
  }

  for (const [index, diagram] of diagrams.entries()) {
    diagram.classList.add("atlas-zoomable");
    diagram.dataset.zoomLevel = "1";
    const label = diagram.getAttribute("aria-label")
      || diagram.querySelector("figcaption")?.textContent.trim()
      || `diagram ${index + 1}`;
    diagram.dataset.diagramLabel = label;
    const toolbar = document.createElement("div");
    toolbar.className = "diagram-toolbar";
    toolbar.setAttribute("aria-label", `View controls for ${label}`);
    toolbar.innerHTML = `
      <button type="button" data-diagram-action="zoom-out" aria-label="Zoom out diagram">−</button>
      <button type="button" data-diagram-action="zoom-in" aria-label="Zoom in diagram">+</button>
      <button type="button" data-diagram-action="expand" aria-label="Expand diagram" aria-pressed="false">⛶</button>
    `;
    toolbar.querySelector('[data-diagram-action="expand"]').setAttribute("aria-label", `Expand ${label}`);
    diagram.append(toolbar);

    toolbar.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      const action = button.dataset.diagramAction;
      if (action === "expand") {
        if (expandedDiagram === diagram) {
          closeExpandedDiagram();
          return;
        }
        closeExpandedDiagram();
        expandedDiagram = diagram;
        restoreButton = button;
        diagram.classList.add("is-expanded");
        diagram.style.setProperty("--diagram-zoom", "1");
        document.body.classList.add("diagram-expanded");
        button.setAttribute("aria-label", `Close expanded ${label}`);
        button.setAttribute("aria-pressed", "true");
        button.focus();
        return;
      }
      if (expandedDiagram !== diagram) return;
      const current = Number(diagram.dataset.zoomLevel || 1);
      const next = action === "zoom-in"
        ? Math.min(1.6, current + .15)
        : Math.max(.7, current - .15);
      diagram.dataset.zoomLevel = String(Number(next.toFixed(2)));
      diagram.style.setProperty("--diagram-zoom", String(next));
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && expandedDiagram) closeExpandedDiagram();
  });
}

function initializeTableScrollCues() {
  const wrappers = [...document.querySelectorAll(
    ".detail-table-wrap, .se-table-wrap, .hw-bottleneck-table-wrap, .em-protocol-table-wrap, .acim-buffer-timeline, .acim-table-wrap"
  )];
  if (!wrappers.length) return;

  function syncCue(wrapper) {
    const maximum = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    wrapper.classList.toggle("can-scroll-left", wrapper.scrollLeft > 2);
    wrapper.classList.toggle("can-scroll-right", wrapper.scrollLeft < maximum - 2);
    wrapper.dataset.horizontalScroll = maximum > 2 ? "available" : "none";
  }

  for (const wrapper of wrappers) {
    wrapper.addEventListener("scroll", () => syncCue(wrapper), { passive: true });
    syncCue(wrapper);
  }
  window.addEventListener("resize", () => {
    for (const wrapper of wrappers) syncCue(wrapper);
  }, { passive: true });
}

initializeInterviewMode();
initializeDiagramControls();
initializeTableScrollCues();
