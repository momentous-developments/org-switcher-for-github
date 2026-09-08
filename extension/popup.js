const MAX_FAVORITES = 5;
const MAX_RECENT_SHOWN = 5;

const ORG_ICON = `<svg class="org-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 14.25V2.75A1.75 1.75 0 0 1 3.25 1h9.5a1.75 1.75 0 0 1 1.75 1.75v11.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75V11h-3v3.25a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75Z"/></svg>`;
const REPO_ICON = `<svg class="repo-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z"/></svg>`;

// Small 12x12 glyphs for the hover-reveal org actions.
const ACTION_ICONS = {
  overview: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5A6.5 6.5 0 1 1 1.5 8 6.5 6.5 0 0 1 8 1.5Zm0 2.75a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM6.75 7.5a.75.75 0 0 0 0 1.5h.5v2.25h-.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-.5V8.25a.75.75 0 0 0-.75-.75Z"/></svg>`,
  repos: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z"/></svg>`,
  projects: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v8.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0 0 16 12.25v-8.5A1.75 1.75 0 0 0 14.25 2ZM1.5 3.75a.25.25 0 0 1 .25-.25H4v9H1.75a.25.25 0 0 1-.25-.25Zm4 8.75v-9h3v9Zm4.5 0v-9h2.75a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25Z"/></svg>`,
};

const ORG_DESTINATIONS = {
  overview: (org) => `https://github.com/${encodeURIComponent(org)}`,
  repos: (org) => `https://github.com/orgs/${encodeURIComponent(org)}/repositories`,
  projects: (org) => `https://github.com/orgs/${encodeURIComponent(org)}/projects`,
};

function openUrl(url) {
  chrome.tabs.create({ url });
}

async function getState() {
  const sync = await chrome.storage.sync.get({
    orgs: [],
    favorites: [],
    trackingPaused: false,
  });
  const local = await chrome.storage.local.get({ recentRepos: [] });
  return {
    orgs: sync.orgs,
    favorites: sync.favorites,
    trackingPaused: sync.trackingPaused,
    recentRepos: local.recentRepos,
  };
}

async function toggleTracking() {
  const { trackingPaused } = await chrome.storage.sync.get({ trackingPaused: false });
  await chrome.storage.sync.set({ trackingPaused: !trackingPaused });
  render();
}

function renderTrackingBar(paused, recentList) {
  const bar = document.getElementById("trackingBar");
  const label = document.getElementById("trackingLabel");
  const action = document.getElementById("trackingToggle");

  bar.classList.toggle("paused", paused);
  label.textContent = paused ? "Tracking paused" : "Tracking recent repos";
  action.textContent = paused ? "Resume" : "Pause";
  action.setAttribute(
    "aria-label",
    paused ? "Resume tracking recent repos" : "Pause tracking recent repos"
  );
  recentList.classList.toggle("paused-list", paused);
}

function makeOrgRow(org) {
  const li = document.createElement("li");
  li.className = "org-row";

  const btn = document.createElement("button");
  btn.className = "row-btn org-name-btn";
  btn.innerHTML = `${ORG_ICON}<span class="row-label">${escapeHtml(org)}</span>`;
  btn.title = `Open ${org} repositories`;
  btn.addEventListener("click", () => {
    openUrl(ORG_DESTINATIONS.repos(org));
  });

  const actions = document.createElement("div");
  actions.className = "org-actions";

  const labels = { overview: "Overview", repos: "Repositories", projects: "Projects" };
  ["overview", "repos", "projects"].forEach((dest) => {
    const actionBtn = document.createElement("button");
    actionBtn.className = "icon-only-btn";
    actionBtn.setAttribute("data-tooltip", labels[dest]);
    actionBtn.setAttribute("aria-label", `${org} — ${labels[dest]}`);
    actionBtn.innerHTML = ACTION_ICONS[dest];
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openUrl(ORG_DESTINATIONS[dest](org));
    });
    actions.appendChild(actionBtn);
  });

  li.appendChild(btn);
  li.appendChild(actions);
  return li;
}

function makeRepoRow(repo, isFavorite, onToggleStar) {
  const li = document.createElement("li");
  li.className = "repo-row";

  const btn = document.createElement("button");
  btn.className = "row-btn repo-name-btn";
  btn.title = `${repo.owner}/${repo.repo}`;
  btn.innerHTML = `${REPO_ICON}<span class="row-label"><span class="repo-owner">${escapeHtml(repo.owner)}/</span>${escapeHtml(repo.repo)}</span>`;
  btn.addEventListener("click", () => {
    openUrl(`https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`);
  });

  const star = document.createElement("button");
  star.className = "star-btn" + (isFavorite ? " active" : "");
  star.title = isFavorite ? "Remove from favorites" : "Add to favorites";
  star.textContent = isFavorite ? "★" : "☆";
  star.addEventListener("click", (e) => {
    e.stopPropagation();
    onToggleStar(repo);
  });

  li.appendChild(btn);
  li.appendChild(star);
  return li;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// A blocking alert() is the wrong shape in a 300px popup, and dismissing one
// can take the popup with it. This matches the inline errors on the settings
// page instead.
let messageTimer;
function showMessage(text) {
  const el = document.getElementById("popupMessage");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    el.hidden = true;
  }, 3000);
}

async function toggleFavorite(repo) {
  const { favorites } = await chrome.storage.sync.get({ favorites: [] });
  const exists = favorites.some((f) => f.key === repo.key);
  let next;
  if (exists) {
    next = favorites.filter((f) => f.key !== repo.key);
  } else {
    if (favorites.length >= MAX_FAVORITES) {
      showMessage(
        `You can pin up to ${MAX_FAVORITES} favorites. Unstar one to make room.`
      );
      return;
    }
    next = [...favorites, repo];
  }
  await chrome.storage.sync.set({ favorites: next });
  render();
}

async function render() {
  const { orgs, favorites, recentRepos, trackingPaused } = await getState();
  const favoriteKeys = new Set(favorites.map((f) => f.key));

  // Organizations
  const orgList = document.getElementById("orgList");
  const orgEmptyState = document.getElementById("orgEmptyState");
  orgList.innerHTML = "";
  if (orgs.length === 0) {
    orgEmptyState.hidden = false;
  } else {
    orgEmptyState.hidden = true;
    orgs.forEach((org) => orgList.appendChild(makeOrgRow(org)));
  }

  // Favorites
  const favoritesSection = document.getElementById("favoritesSection");
  const favoriteList = document.getElementById("favoriteList");
  favoriteList.innerHTML = "";
  if (favorites.length > 0) {
    favoritesSection.hidden = false;
    favorites.forEach((repo) =>
      favoriteList.appendChild(makeRepoRow(repo, true, toggleFavorite))
    );
  } else {
    favoritesSection.hidden = true;
  }

  // Recent (excluding anything already pinned as a favorite, to avoid duplicate rows)
  const recentSection = document.getElementById("recentSection");
  const recentList = document.getElementById("recentList");
  recentList.innerHTML = "";
  const recentToShow = recentRepos
    .filter((r) => !favoriteKeys.has(r.key))
    .slice(0, MAX_RECENT_SHOWN);

  renderTrackingBar(trackingPaused, recentList);

  if (recentToShow.length > 0) {
    recentSection.hidden = false;
    recentToShow.forEach((repo) =>
      recentList.appendChild(makeRepoRow(repo, false, toggleFavorite))
    );
  } else {
    recentSection.hidden = true;
  }
}

document.getElementById("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("trackingToggle").addEventListener("click", toggleTracking);

render();
