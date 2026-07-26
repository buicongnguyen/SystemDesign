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
  if (!topicNav) return;
  const topicLinks = [...topicNav.querySelectorAll('a[href^="#"]')];
  const currentTopic = topicLinks.find(link => new URL(link.href, location.href).hash === location.hash);
  for (const link of topicLinks) link.removeAttribute("aria-current");
  if (!currentTopic || !location.hash) return;
  currentTopic.setAttribute("aria-current", "location");
  revealNavLink(topicNav, currentTopic);
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
}

const practiceSection = document.querySelector("#practice");

function initializeInterviewMode() {
  if (!topicNav || !practiceSection) return;

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
  topicNav.append(trigger);

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
    if (restoreFocus) trigger.focus();
  }

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
