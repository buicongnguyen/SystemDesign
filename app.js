const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");

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

function revealCurrentTrack() {
  if (!trackNav || !currentTrack || trackNav.scrollWidth <= trackNav.clientWidth) return;
  const centeredLeft = currentTrack.offsetLeft - (trackNav.clientWidth - currentTrack.offsetWidth) / 2;
  trackNav.scrollTo({ left: Math.max(0, centeredLeft), behavior: "auto" });
}

requestAnimationFrame(revealCurrentTrack);
