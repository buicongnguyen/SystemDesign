(() => {
  const root = document.documentElement;
  let theme;

  try {
    const saved = localStorage.getItem("atlas-theme") || localStorage.getItem("dsa-theme");
    theme = saved === "light" || saved === "dark" ? saved : null;
  } catch {
    theme = null;
  }

  root.dataset.theme = theme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
})();
