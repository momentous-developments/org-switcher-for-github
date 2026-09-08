import { ORG_SLUG_PATTERN, normalizeOrgInput } from "./lib/org-slug.js";

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

async function setOrgs(orgs) {
  await chrome.storage.sync.set({ orgs });
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
  await setOrgs(orgs);
  renderOrgs();
}

async function removeOrg(idx) {
  const orgs = await getOrgs();
  orgs.splice(idx, 1);
  await setOrgs(orgs);
  renderOrgs();
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
  await setOrgs(orgs);
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
      await chrome.storage.sync.set({
        favorites: current.filter((f) => f.key !== repo.key),
      });
      renderFavorites();
    });

    controls.appendChild(removeBtn);
    li.append(name, controls);
    favoriteListEl.appendChild(li);
  });
}

clearHistoryBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ recentRepos: [] });
  clearedMsg.hidden = false;
  setTimeout(() => {
    clearedMsg.hidden = true;
  }, 2500);
});

renderOrgs();
renderFavorites();
