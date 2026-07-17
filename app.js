const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');

function readTheme() {
  try {
    return localStorage.getItem("dsa-theme");
  } catch {
    return null;
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const targetTheme = nextTheme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  themeToggle?.setAttribute("aria-pressed", String(nextTheme === "light"));
  themeToggle?.setAttribute("aria-label", `Switch to ${targetTheme} theme`);
  themeToggle?.setAttribute("title", `Switch to ${targetTheme} theme`);
  themeColor?.setAttribute("content", nextTheme === "light" ? "#f5f8fc" : "#07111f");
}

applyTheme(readTheme());

themeToggle?.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  try {
    localStorage.setItem("dsa-theme", next);
  } catch {
    // The preference is optional; controls must still work when storage is blocked.
  }
});

const decisions = {
  latency: {
    answer: "Add cache-aside for hot reads and measure hit rate.",
    tradeoffs: ["staleness", "invalidation", "memory cost", "stampede risk"]
  },
  traffic: {
    answer: "Make compute stateless, load balance replicas, and buffer slow work.",
    tradeoffs: ["session storage", "autoscaling lag", "retry storms", "queue delay"]
  },
  storage: {
    answer: "Choose a stable partition key, shard data, and plan rebalancing.",
    tradeoffs: ["cross-shard queries", "hot partitions", "resizing", "global uniqueness"]
  },
  reliability: {
    answer: "Remove single points of failure and add timeouts, isolation, and failover.",
    tradeoffs: ["complexity", "recovery time", "consistency", "cost"]
  },
  global: {
    answer: "Serve at the edge, route by region, and define data ownership.",
    tradeoffs: ["replication lag", "data residency", "conflict resolution", "operability"]
  }
};

const answer = document.querySelector("#decision-answer");
const tradeoffs = document.querySelector("#decision-tradeoffs");
const nodes = [...document.querySelectorAll("[data-decision]")];

function showDecision(key) {
  const decision = decisions[key];
  if (!answer || !tradeoffs || !decision) return;
  answer.textContent = decision.answer;
  tradeoffs.innerHTML = decision.tradeoffs.map(item => `<span class="algorithm-chip">${item}</span>`).join("");
  nodes.forEach(node => {
    const active = node.dataset.decision === key;
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", String(active));
  });
}

nodes.forEach(node => node.addEventListener("click", () => showDecision(node.dataset.decision)));
if (answer && tradeoffs) showDecision("latency");

const scenarios = {
  shortener: {
    title: "Design a URL shortening service",
    prompt: "Users submit a long URL and receive a short link. Opening the short link redirects quickly and reliably.",
    signals: ["Read-heavy", "Low latency", "Simple key lookup", "Abuse risk"],
    clarifyQuestion: "What traffic, retention, custom-alias, expiration, and analytics requirements matter?",
    clarifyAnswer: "<p>Confirm create + redirect as the core. Ask about 301 vs 302 redirects, link expiration, custom aliases, deletion, analytics freshness, availability target, and geographic scope.</p>",
    estimateQuestion: "Estimate average/peak reads, writes, storage per year, and cacheable hot traffic.",
    estimateAnswer: "<p>Example: 100M new links/month ≈ 40 writes/s average. At 100 reads per write, redirects average ≈ 4K/s; use 5–10× for peak. At roughly 500 bytes per record, one year is about 600 GB of raw records before indexes, replication, allocator overhead, and backups. The read-heavy ratio strongly favors caching.</p>",
    modelQuestion: "Define create and redirect APIs, then choose the minimum durable record.",
    modelAnswer: "<p><code>POST /links {longUrl, customAlias?, expiresAt?}</code> → short code. <code>GET /{code}</code> → redirect. Record: <code>code, long_url, created_at, expires_at, owner_id</code>. Keep click events outside the redirect transaction.</p>",
    flowQuestion: "Which components handle creation, lookup, caching, persistence, and background work?",
    flowAnswer: "<p>Create: client → API → validation/abuse checks → ID generator → database → response. Redirect: edge/load balancer → redirect service → cache → database on miss → redirect. Publish click events asynchronously for analytics.</p>",
    deepQuestion: "How are unique short codes generated without collisions or a central bottleneck?",
    deepAnswer: "<p>Options: random Base62 with a uniqueness check is simple; range-allocated numeric IDs encoded as Base62 avoid collisions; Snowflake-style IDs distribute generation but produce longer codes. Discuss predictability, collision handling, coordination, and code length.</p>",
    closeQuestion: "What fails first, how do users experience it, and what do you monitor?",
    closeAnswer: "<p>Monitor redirect p50/p95/p99, cache hit rate, database saturation, error rate, hot keys, creation failures, and queue lag. During analytics failure, redirects should continue. During cache failure, protect the database with request coalescing and load shedding.</p>"
  },
  feed: {
    title: "Design a personalized news feed",
    prompt: "Users create posts, follow other users, and open a ranked home feed containing recent relevant posts.",
    signals: ["Fan-out", "Hot users", "Ranking", "Eventual consistency"],
    clarifyQuestion: "Is the feed chronological or ranked, how fresh must it be, and what scale of followers must one user support?",
    clarifyAnswer: "<p>Clarify posting, following, pagination, ranking, visibility, deletion, freshness, celebrity accounts, and whether ads or recommendations are in scope. Confirm that brief eventual consistency is acceptable.</p>",
    estimateQuestion: "Estimate feed reads, posts, following edges, fan-out writes, and per-user feed storage.",
    estimateAnswer: "<p>Example: 100M daily users opening the feed 10 times/day gives roughly 12K reads/s average. If 10M posts/day fan out to 200 followers on average, naïve fan-out creates 2B timeline insertions/day—making distribution strategy the key deep dive.</p>",
    modelQuestion: "Define post creation and cursor-based feed APIs, then model posts, follows, and timeline entries.",
    modelAnswer: "<p><code>POST /posts</code>, <code>GET /feed?cursor=…</code>, and follow/unfollow APIs. Store immutable posts separately from lightweight timeline entries containing user, post ID, score/time, and cursor fields.</p>",
    flowQuestion: "Trace post creation and feed reading through storage, queues, ranking, and cache.",
    flowAnswer: "<p>Write: post service persists → event bus → fan-out workers update follower timelines. Read: feed service reads timeline IDs → hydrates posts → filters/ranks → caches the page. Keep the durable post store separate from materialized feeds.</p>",
    deepQuestion: "When should the system push posts into feeds versus pull them at read time?",
    deepAnswer: "<p>Fan-out-on-write makes reads fast for ordinary users but explodes work for celebrities. Fan-out-on-read avoids huge writes but increases read latency. A hybrid pushes normal accounts and merges celebrity posts during reads.</p>",
    closeQuestion: "How do deletion, ranking failure, duplicate events, and overloaded fan-out degrade?",
    closeAnswer: "<p>Use idempotent timeline insertion, tombstones for deletion, cursor pagination, queue-lag monitoring, and a chronological fallback if ranking fails. Measure feed freshness, generation latency, empty-feed rate, fan-out lag, and hot partitions.</p>"
  },
  chat: {
    title: "Design a real-time chat system",
    prompt: "Users exchange one-to-one and group messages across devices with online delivery, history, and read state.",
    signals: ["Persistent connections", "Ordering", "Offline delivery", "Multi-device"],
    clarifyQuestion: "Which delivery guarantees, group sizes, message types, presence, and read-receipt behavior are required?",
    clarifyAnswer: "<p>Clarify 1:1 vs groups, maximum group size, text/media, multi-device sync, online/offline delivery, history retention, ordering scope, read receipts, presence accuracy, and end-to-end encryption.</p>",
    estimateQuestion: "Estimate concurrent connections, messages per second, message storage, and connection-server fan-out.",
    estimateAnswer: "<p>Example: 50M daily users with 5M concurrent connections requires many connection servers even before message QPS becomes large. At 1B messages/day, average throughput is about 12K/s; size peaks and attachments separately.</p>",
    modelQuestion: "Define send/sync APIs and the identifiers required for ordering and idempotency.",
    modelAnswer: "<p>WebSocket for live events plus HTTP for history/media. A message includes <code>message_id, conversation_id, sender_id, sequence, client_idempotency_key, sent_at, payload_ref</code>. Order within a conversation, not globally.</p>",
    flowQuestion: "Trace a message from sender socket to durable storage and every recipient device.",
    flowAnswer: "<p>Sender → connection gateway → chat service/sequencer → durable message store → conversation event stream → recipient gateways → devices. Offline recipients consume from per-user/device sync state when reconnecting.</p>",
    deepQuestion: "How do you preserve conversation order while supporting retries and multiple devices?",
    deepAnswer: "<p>Assign a monotonically increasing sequence per conversation or partition conversations consistently to ordered log partitions. Use client idempotency keys, acknowledge only after durability, allow duplicate delivery, and deduplicate on clients/servers.</p>",
    closeQuestion: "What happens when a gateway disconnects, a recipient is offline, or a notification provider fails?",
    closeAnswer: "<p>Reconnect with a resume cursor, keep durable unread state, and treat push notification as best-effort rather than message delivery. Monitor connection count, reconnect rate, send-to-ack latency, delivery lag, duplicate rate, and partition imbalance.</p>"
  }
};

const scenarioFields = ["title", "prompt", "clarifyQuestion", "clarifyAnswer", "estimateQuestion", "estimateAnswer", "modelQuestion", "modelAnswer", "flowQuestion", "flowAnswer", "deepQuestion", "deepAnswer", "closeQuestion", "closeAnswer"];
const scenarioTabs = [...document.querySelectorAll("[data-scenario]")];
const signalList = document.querySelector("#scenario-signals");

function showScenario(key) {
  const scenario = scenarios[key];
  if (!scenario || !signalList) return;
  scenarioFields.forEach(field => {
    const element = document.querySelector(`#scenario-${field.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`);
    if (!element) return;
    if (field.endsWith("Answer")) element.innerHTML = scenario[field];
    else element.textContent = scenario[field];
  });
  signalList.innerHTML = scenario.signals.map(signal => `<li>${signal}</li>`).join("");
  document.querySelectorAll(".practice-checkpoints details").forEach(detail => { detail.open = false; });
  scenarioTabs.forEach(tab => {
    const active = tab.dataset.scenario === key;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
}

scenarioTabs.forEach(tab => tab.addEventListener("click", () => showScenario(tab.dataset.scenario)));
if (signalList) showScenario("shortener");
