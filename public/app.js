/* ─────────────────────────────────────────
   WattWise — Frontend App Logic
   ───────────────────────────────────────── */

// ── Session ID (persisted per browser tab)
const SESSION_ID = "ww_" + Math.random().toString(36).slice(2, 10);

// ── DOM refs ──
const sidebar = document.getElementById("sidebar");
const sidebarOpen = document.getElementById("sidebarOpen");
const sidebarClose = document.getElementById("sidebarClose");
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".tab-panel");
const pageTitle = document.getElementById("pageTitle");
const clearChatBtn = document.getElementById("clearChat");
const chatMessages = document.getElementById("chatMessages");
const suggestions = document.getElementById("suggestions");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const refreshTipsBtn = document.getElementById("refreshTips");
const tipsGrid = document.getElementById("tipsGrid");
const addApplianceBtn = document.getElementById("addAppliance");
const applianceList = document.getElementById("applianceList");
const calcResults = document.getElementById("calcResults");
const askAgentBtn = document.getElementById("askAgentBtn");

const TITLES = { chat: "AI Chat", calculator: "Calculator", tips: "Saving Tips", stats: "Stats" };

// ── Sidebar toggle ──
sidebarOpen.addEventListener("click", () => sidebar.classList.add("open"));
sidebarClose.addEventListener("click", () => sidebar.classList.remove("open"));

// ── Tab navigation ──
navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    navItems.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    panels.forEach((p) => p.classList.remove("active"));
    document.getElementById("panel-" + tab).classList.add("active");
    pageTitle.textContent = TITLES[tab] || tab;
    clearChatBtn.style.display = tab === "chat" ? "" : "none";
    sidebar.classList.remove("open");
  });
});

// Hide clear button on non-chat panels initially
clearChatBtn.style.display = "";

// ── Clear chat ──
clearChatBtn.addEventListener("click", async () => {
  // Remove all messages except the welcome one
  const msgs = chatMessages.querySelectorAll(".message");
  msgs.forEach((m, i) => { if (i > 0) m.remove(); });
  suggestions.style.display = "";
  try { await fetch(`/api/session/${SESSION_ID}`, { method: "DELETE" }); } catch (_) {}
});

// ── Auto-resize textarea ──
chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
  sendBtn.disabled = chatInput.value.trim() === "";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener("click", sendMessage);

// ── Suggestion chips ──
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chatInput.value = chip.dataset.prompt;
    chatInput.dispatchEvent(new Event("input"));
    sendMessage();
  });
});

// ────────────────────────────────────────────────────
// CHAT ENGINE
// ────────────────────────────────────────────────────

function appendMessage(role, content) {
  const isAgent = role === "agent";
  const wrap = document.createElement("div");
  wrap.className = "message " + role;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = isAgent
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = renderMarkdown(content);

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message agent";
  wrap.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  chatInput.style.height = "auto";
  sendBtn.disabled = true;
  suggestions.style.display = "none";

  appendMessage("user", text);
  const typingEl = appendTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
    });

    const data = await res.json();
    typingEl.remove();

    if (data.error) {
      appendMessage("agent", "⚠️ Error: " + data.error);
    } else {
      appendMessage("agent", data.reply);
    }
  } catch (err) {
    typingEl.remove();
    appendMessage("agent", "⚠️ Could not reach the server. Please ensure the backend is running.");
  }
}

// ────────────────────────────────────────────────────
// SIMPLE MARKDOWN RENDERER
// ────────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    // Escape HTML special chars first
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // H3
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // H2
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    // H1
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Unordered lists
    .replace(/^\s*[-*•] (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\s*\d+\. (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]+?<\/li>)(?=\s*(?!<li>))/g, "<ul>$&</ul>")
    // Line breaks
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return "<p>" + html + "</p>";
}

// ────────────────────────────────────────────────────
// CALCULATOR
// ────────────────────────────────────────────────────

const DEFAULT_APPLIANCES = [
  { name: "Air Conditioner", watts: 1500, hoursPerDay: 8 },
  { name: "Refrigerator", watts: 150, hoursPerDay: 24 },
  { name: "LED Lighting (5 bulbs)", watts: 50, hoursPerDay: 6 },
];

function createApplianceRow(data = {}) {
  const row = document.createElement("div");
  row.className = "appliance-row";
  row.innerHTML = `
    <input type="text" placeholder="Appliance name" value="${data.name || ""}" class="name-input" />
    <input type="number" placeholder="Watts" value="${data.watts || ""}" class="watts-input" min="1" step="1" />
    <input type="number" placeholder="Hrs/day" value="${data.hoursPerDay || ""}" class="hrs-input" min="0" max="24" step="0.5" />
    <button class="remove-btn" title="Remove">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
    recalculate();
  });
  row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", recalculate));
  return row;
}

// Pre-populate with defaults
DEFAULT_APPLIANCES.forEach((a) => applianceList.appendChild(createApplianceRow(a)));

addApplianceBtn.addEventListener("click", () => {
  const row = createApplianceRow();
  applianceList.appendChild(row);
  row.querySelector(".name-input").focus();
});

function recalculate() {
  const rows = applianceList.querySelectorAll(".appliance-row");
  const appliances = [];
  rows.forEach((row) => {
    const name = row.querySelector(".name-input").value.trim() || "Unnamed";
    const watts = parseFloat(row.querySelector(".watts-input").value) || 0;
    const hoursPerDay = parseFloat(row.querySelector(".hrs-input").value) || 0;
    if (watts > 0 && hoursPerDay > 0) {
      appliances.push({ name, watts, hoursPerDay });
    }
  });

  if (appliances.length === 0) { calcResults.classList.add("hidden"); return; }

  const rate = parseFloat(document.getElementById("rateInput").value) || 0.13;

  // Local calc (no server round-trip needed for live updates)
  let totalKwh = 0;
  const results = appliances.map((a) => {
    const daily = (a.watts * a.hoursPerDay) / 1000;
    const monthly = daily * 30;
    totalKwh += monthly;
    return { ...a, monthlyCost: (monthly * rate).toFixed(2), monthlyKWh: monthly.toFixed(2) };
  });

  const monthlyCost = (totalKwh * rate).toFixed(2);
  const yearlyCost = (totalKwh * rate * 12).toFixed(2);
  const co2 = (totalKwh * 0.386).toFixed(2);

  document.getElementById("resKwh").textContent = totalKwh.toFixed(1) + " kWh";
  document.getElementById("resCost").textContent = "$" + monthlyCost;
  document.getElementById("resYear").textContent = "$" + yearlyCost;
  document.getElementById("resCo2").textContent = co2 + " kg";

  // Breakdown table
  const breakdown = document.getElementById("applianceBreakdown");
  breakdown.innerHTML = `
    <table class="breakdown-table">
      <thead><tr><th>Appliance</th><th>Watts</th><th>kWh/mo</th><th>Cost/mo</th></tr></thead>
      <tbody>
        ${results.map((r) => `<tr><td>${r.name}</td><td>${r.watts}W</td><td>${r.monthlyKWh}</td><td>$${r.monthlyCost}</td></tr>`).join("")}
      </tbody>
    </table>`;

  calcResults.classList.remove("hidden");
  // Store for ask-agent
  calcResults.dataset.summary = JSON.stringify({ appliances: results, totalKwh: totalKwh.toFixed(1), monthlyCost, yearlyCost, co2 });
}

// Initial calculation
recalculate();

// ── Ask WattWise about calculator results ──
askAgentBtn.addEventListener("click", () => {
  const data = JSON.parse(calcResults.dataset.summary || "{}");
  if (!data.appliances) return;

  const lines = data.appliances.map((a) => `- ${a.name}: ${a.watts}W × ${a.hoursPerDay}h/day → $${a.monthlyCost}/mo`).join("\n");
  const msg = `Here is my monthly electricity usage:\n${lines}\n\nTotal: ${data.totalKwh} kWh/month, $${data.monthlyCost}/month, $${data.yearlyCost}/year, ${data.co2} kg CO₂.\n\nPlease analyse this and give me specific advice to reduce my consumption and costs.`;

  // Switch to chat tab
  document.querySelector('[data-tab="chat"]').click();
  chatInput.value = msg;
  chatInput.dispatchEvent(new Event("input"));
  setTimeout(sendMessage, 100);
});

// Rate change triggers recalc
document.getElementById("rateInput").addEventListener("input", recalculate);

// ────────────────────────────────────────────────────
// TIPS
// ────────────────────────────────────────────────────

const CAT_CLASS = {
  "heating": "cat-heating", "cooling": "cat-cooling", "lighting": "cat-lighting",
  "appliances": "cat-appliances", "standby": "cat-standby", "habits": "cat-habits",
};

refreshTipsBtn.addEventListener("click", loadTips);

async function loadTips() {
  refreshTipsBtn.disabled = true;
  refreshTipsBtn.classList.add("loading");
  tipsGrid.innerHTML = `<div class="tips-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Generating tips…</p></div>`;

  try {
    const res = await fetch("/api/tips");
    const data = await res.json();

    if (data.tips && data.tips.length > 0) {
      tipsGrid.innerHTML = "";
      data.tips.forEach((tip) => {
        const cat = (tip.category || "habits").toLowerCase();
        const catClass = CAT_CLASS[cat] || "cat-habits";
        const card = document.createElement("div");
        card.className = "tip-card";
        card.innerHTML = `
          <span class="tip-category ${catClass}">${cap(cat)}</span>
          <p class="tip-text">${escapeHtml(tip.tip)}</p>
          <span class="tip-savings">💰 ${escapeHtml(tip.savings || "")}</span>
        `;
        tipsGrid.appendChild(card);
      });
    } else {
      tipsGrid.innerHTML = `<div class="tips-placeholder"><p>No tips returned. Try again.</p></div>`;
    }
  } catch (err) {
    tipsGrid.innerHTML = `<div class="tips-placeholder"><p>Failed to load tips. Is the server running?</p></div>`;
  } finally {
    refreshTipsBtn.disabled = false;
    refreshTipsBtn.classList.remove("loading");
  }
}

// ── Helpers ──
function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
