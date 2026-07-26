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

function syncStickyHeaderOffset() {
  if (!siteHeader) return;
  root.style.setProperty("--site-header-height", `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
}

function revealCurrentTrack() {
  if (!trackNav || !currentTrack) return;
  if (trackNav.scrollWidth <= trackNav.clientWidth) {
    trackNav.scrollTo({ left: 0, behavior: "auto" });
    return;
  }
  const navRect = trackNav.getBoundingClientRect();
  const linkRect = currentTrack.getBoundingClientRect();
  const linkCenterInContent = linkRect.left - navRect.left + trackNav.scrollLeft + linkRect.width / 2;
  trackNav.scrollTo({ left: Math.max(0, linkCenterInContent - trackNav.clientWidth / 2), behavior: "auto" });
}

let layoutFrame;
function scheduleLayoutSync() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    syncStickyHeaderOffset();
    revealCurrentTrack();
  });
}

scheduleLayoutSync();
window.addEventListener("resize", scheduleLayoutSync, { passive: true });
window.addEventListener("orientationchange", scheduleLayoutSync, { passive: true });

if (typeof ResizeObserver === "function") {
  const layoutObserver = new ResizeObserver(scheduleLayoutSync);
  if (siteHeader) layoutObserver.observe(siteHeader);
  if (trackNav) layoutObserver.observe(trackNav);
}
