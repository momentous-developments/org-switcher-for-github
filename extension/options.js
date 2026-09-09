import { ORG_SLUG_PATTERN, normalizeOrgInput } from "./lib/org-slug.js";
import { UMAMI_ORIGIN, WEBSITE_ID } from "./lib/analytics.js";

const form = document.getElementById("addOrgForm");
const input = document.getElementById("orgInput");
const errorMsg = document.getElementById("errorMsg");
const orgListEl = document.getElementById("orgList");
const emptyState = document.getElementById("emptyState");
const favoriteListEl = document.getElementById("favoriteList");
const favEmptyState = document.getElementById("favEmptyState");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const clearedMsg = document.getElementById("clearedMsg");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function clearError() {
  errorMsg.hidden = true;
}

async function getOrgs() {
  const { orgs } = await chrome.storage.sync.get({ orgs: [] });
  return orgs;
}

// Sync storage can refuse a write (per-item size, or the write rate limit).
// Reporting it through the same error line the form already uses beats an
// unhandled rejection that looks like nothing happened.
async function saveSync(values) {
  try {
    await chrome.storage.sync.set(values);
    return true;
  } catch (err) {
    console.error("Could not save to Chrome sync storage", err);
    showError("Couldn't save that. Chrome's sync storage refused the write.");
    return false;
  }
}

async function setOrgs(orgs) {
  return saveSync({ orgs });
}

async function renderOrgs() {
  const orgs = await getOrgs();
  orgListEl.innerHTML = "";
  emptyState.hidden = orgs.length !== 0;

  orgs.forEach((org, idx) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = org;

    const controls = document.createElement("div");
    controls.className = "controls";

    const upBtn = document.createElement("button");
    upBtn.className = "icon-btn";
    upBtn.textContent = "↑";
    upBtn.title = "Move up";
    upBtn.disabled = idx === 0;
    upBtn.addEventListener("click", () => moveOrg(idx, -1));

    const downBtn = document.createElement("button");
    downBtn.className = "icon-btn";
    downBtn.textContent = "↓";
    downBtn.title = "Move down";
    downBtn.disabled = idx === orgs.length - 1;
    downBtn.addEventListener("click", () => moveOrg(idx, 1));

    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", () => removeOrg(idx));

    controls.append(upBtn, downBtn, removeBtn);
    li.append(name, controls);
    orgListEl.appendChild(li);
  });
}

async function moveOrg(idx, delta) {
  const orgs = await getOrgs();
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= orgs.length) return;
  [orgs[idx], orgs[newIdx]] = [orgs[newIdx], orgs[idx]];
  if (await setOrgs(orgs)) renderOrgs();
}

async function removeOrg(idx) {
  const orgs = await getOrgs();
  orgs.splice(idx, 1);
  if (await setOrgs(orgs)) renderOrgs();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const slug = normalizeOrgInput(input.value);

  if (!slug) {
    showError("Enter an organization slug.");
    return;
  }
  if (!ORG_SLUG_PATTERN.test(slug)) {
    showError("That doesn't look like a valid GitHub org slug (letters, numbers, hyphens only).");
    return;
  }

  const orgs = await getOrgs();
  if (orgs.some((o) => o.toLowerCase() === slug.toLowerCase())) {
    showError(`"${slug}" is already in your list.`);
    return;
  }

  orgs.push(slug);
  if (!(await setOrgs(orgs))) return;
  input.value = "";
  renderOrgs();
});

async function renderFavorites() {
  const { favorites } = await chrome.storage.sync.get({ favorites: [] });
  favoriteListEl.innerHTML = "";
  favEmptyState.hidden = favorites.length !== 0;

  favorites.forEach((repo) => {
    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = `${repo.owner}/${repo.repo}`;

    const controls = document.createElement("div");
    controls.className = "controls";

    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove favorite";
    removeBtn.addEventListener("click", async () => {
      const { favorites: current } = await chrome.storage.sync.get({ favorites: [] });
      const kept = current.filter((f) => f.key !== repo.key);
      if (await saveSync({ favorites: kept })) renderFavorites();
    });

    controls.appendChild(removeBtn);
    li.append(name, controls);
    favoriteListEl.appendChild(li);
  });
}

clearHistoryBtn.addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ recentRepos: [] });
  } catch (err) {
    console.error("Could not clear the recent list", err);
    showError("Couldn't clear the history. Chrome's storage refused the write.");
    return;
  }
  clearedMsg.hidden = false;
  setTimeout(() => {
    clearedMsg.hidden = true;
  }, 2500);
});

// ---------------------------------------------------------------- usage stats

const statsSection = document.getElementById("usage-stats");
const statsToggle = document.getElementById("statsToggle");
const statsSent = document.getElementById("statsSent");
const statsError = document.getElementById("statsError");

function showStatsError(msg) {
  statsError.textContent = msg;
  statsError.hidden = false;
}

// The switch reflects two things that can disagree: what the user set here,
// and what Chrome actually granted. A permission revoked from Chrome's own
// extension settings has to show as off, or the box would promise something
// that is not happening.
async function renderStats() {
  const { analyticsEnabled } = await chrome.storage.local.get({
    analyticsEnabled: false,
  });
  const granted = await chrome.permissions.contains({ origins: [UMAMI_ORIGIN] });
  const on = analyticsEnabled && granted;

  statsToggle.checked = on;
  statsSent.hidden = !on;

  if (analyticsEnabled && !granted) {
    await chrome.storage.local.set({ analyticsEnabled: false });
  }
}

statsToggle.addEventListener("change", async () => {
  statsError.hidden = true;

  if (!statsToggle.checked) {
    await chrome.storage.local.set({ analyticsEnabled: false });
    await chrome.permissions.remove({ origins: [UMAMI_ORIGIN] });
    await renderStats();
    return;
  }

  if (!WEBSITE_ID) {
    statsToggle.checked = false;
    showStatsError("Usage stats are not configured in this build, so nothing would be sent.");
    return;
  }

  // Must run inside the click that ticked the box: Chrome only shows the
  // permission dialog from a user gesture.
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [UMAMI_ORIGIN] });
  } catch (err) {
    console.error("Permission request failed", err);
  }

  if (!granted) {
    statsToggle.checked = false;
    showStatsError("Permission declined, so usage stats stay off.");
    return;
  }

  await chrome.storage.local.set({ analyticsEnabled: true });
  await renderStats();
});

// Arriving from the popup prompt. Scroll it into view either way; the flash is
// only for people who have not asked for reduced motion.
function highlightIfRequested() {
  if (location.hash !== "#usage-stats") return;
  statsSection.scrollIntoView({ block: "center" });
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) return;
  statsSection.classList.add("lit");
  setTimeout(() => statsSection.classList.remove("lit"), 1200);
}

renderOrgs();
renderFavorites();
renderStats().then(highlightIfRequested);
