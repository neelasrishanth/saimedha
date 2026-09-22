
const API_BASE = "";

function token() {
  return localStorage.getItem("saimedha_token") || "";
}


function initials(name) {
  return String(name || "S")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function toast(message) {
  let el = document.getElementById("studentToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "studentToast";
    el.style.cssText =
      "position:fixed;right:22px;bottom:22px;background:#171b22;color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,.18);z-index:50;opacity:0;transform:translateY(8px);transition:.2s";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = "1";
  el.style.transform = "translateY(0)";
  clearTimeout(window.studentToastTimer);
  window.studentToastTimer = setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
  }, 1800);
}

function renderEmpty(container, icon, title, copy) {
  container.innerHTML = `<div class="empty"><div><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${copy}</p></div></div>`;
}


async function initBatches() {
  const search = document.getElementById("batchSearch");
  const existingCard = document.querySelector(".batch-card");
  if (!search || !existingCard) return;

  const list = document.createElement("div");
  list.id = "batchList";
  list.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,400px));gap:18px";
  existingCard.replaceWith(list);

  let batches = [];
  function render() {
    const query = search.value.toLowerCase().trim();
    const filtered = batches.filter((batch) => batch.title.toLowerCase().includes(query));
    if (!filtered.length) {
      list.innerHTML = '<div class="empty" style="min-height:220px"><div><div class="empty-icon">📖</div><h3>No Batches Found</h3><p>Try another course name.</p></div></div>';
      return;
    }
    list.innerHTML = filtered
      .map(
        (batch) =>
          `<div class="batch-card"><div class="batch-header">${batch.title}<span style="font-size:11px;background:#ffdf42;padding:5px 8px;border-radius:6px;float:right">${batch.badge || "new"}</span></div><div class="batch-img">${batch.title.replace(/\s+/g, "<br/>")}</div><div class="expired">${batch.status === "active" ? "✅" : "⛔"} ${batch.statusLabel}</div></div>`,
      )
      .join("");
  }

  try {
    batches = (await api("/api/batches")).batches;
    render();
    search.addEventListener("input", render);
  } catch {
    list.replaceWith(existingCard);
  }
}

async function initProfile() {
  const saveProfile = document.getElementById("saveProfile");
  if (!saveProfile) return;

  const nameInput = document.getElementById("profileName");
  const emailInput = document.getElementById("profileEmail");
  const phoneInput = document.getElementById("profilePhone");

  try {
    const { user } = await api("/api/me");
    nameInput.value = user.name || "";
    emailInput.value = user.email || "";
    phoneInput.value = user.phone || "";
  } catch {}

  saveProfile.addEventListener("click", async () => {
    try {
      const { user } = await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: nameInput.value,
          email: emailInput.value,
          phone: phoneInput.value,
        }),
      });
      document.querySelector(".avatar").textContent = initials(user.name);
      toast("Profile changes saved");
    } catch (error) {
      toast(error.message);
    }
  });
}

async function initPurchases() {
  if (!document.title.includes("My Purchases")) return;
  const section = document.querySelector(".page");
  if (!section) return;

  try {
    const { purchases } = await api("/api/purchases");
    section.innerHTML = '<div class="tabs"><button class="tab active">PW Orders</button><button class="tab">Store Orders</button></div>';
    section.insertAdjacentHTML(
      "beforeend",
      purchases
        .map(
          (order) =>
            `<div class="purchase"><div class="purchase-main"><div class="purchase-thumb">${order.title.replace(/\s+/g, "<br/>")}</div><div class="purchase-info"><span class="status ${order.status === "SUCCESS" ? "success" : "failed"}">${order.status}</span><h3>${order.title}</h3><p>${new Date(order.orderedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })} • ${money(order.amount)}</p></div><div class="purchase-arrow">›</div></div>${order.warning ? `<div class="notice warn">${order.warning}</div>` : ""}<div class="notice">${order.notice}</div></div>`,
        )
        .join(""),
    );
  } catch {}
}

async function initSimpleLists() {
  const pageTitle = document.title;
  const page = document.querySelector(".page");
  if (!page) return;

  const configs = [
    ["Bookmarks", "/api/bookmarks", "bookmarks", "🔖", "No Bookmarks Found", "Your saved questions will appear here."],
    ["My Doubts", "/api/doubts", "doubts", "❔", "No Doubts Found", "Your asked doubts will appear here."],
    ["My History", "/api/history", "history", "📄🔍", "No Content Found", "Your watched videos will be saved here."],
    ["My Tests", "/api/tests", "tests", "📄🔍", "No Test Pass Purchased!", "Your purchased Test Pass will appear here."],
  ];
  const config = configs.find(([title]) => pageTitle.includes(title));
  if (!config) return;

  const [, endpoint, key, icon, emptyTitle, emptyCopy] = config;
  try {
    const data = await api(endpoint);
    const items = data[key] || [];
    if (!items.length) return renderEmpty(page, icon, emptyTitle, emptyCopy);
    page.innerHTML = `<div class="content-panel"><h1 class="page-title">${config[0]}</h1><div style="display:grid;gap:14px">${items
      .map((item) => `<div class="quick-card" style="width:100%"><h3>${item.title || item.question}</h3><p>${item.course || `${item.attempts || 0}/${item.totalTests || 0} tests attempted`}</p></div>`)
      .join("")}</div></div>`;
  } catch {}
}

const exploreCareer = document.getElementById("exploreCareer");
if (exploreCareer) {
  exploreCareer.addEventListener("click", () => {
    window.location.href = "store.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initShell();
  initBatches();
  initProfile();
  initPurchases();
  initSimpleLists();
});
