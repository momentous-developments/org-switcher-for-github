// Records repos the user visits on github.com so the popup can show a "Recent"
// list. No GitHub API calls are made and no request leaves the browser: this
// only reads the tab's own URL, which the github.com host permission already
// covers.

import { parseRepoFromUrl } from "./lib/parse-repo-url.js";

const RECENT_LIMIT = 15;

// Reading, changing and writing the recent list is not atomic, so two GitHub
// tabs finishing within a few milliseconds of each other would otherwise both
// read the same list and one write would be lost. Chaining through a single
// promise serialises them.
let writeQueue = Promise.resolve();

async function recordVisit({ owner, repo, key }) {
  const { trackingPaused } = await chrome.storage.sync.get({
    trackingPaused: false,
  });
  if (trackingPaused) return;

  const { recentRepos } = await chrome.storage.local.get({ recentRepos: [] });
  const withoutThisRepo = recentRepos.filter((r) => r.key !== key);
  withoutThisRepo.unshift({ key, owner, repo, visitedAt: Date.now() });

  await chrome.storage.local.set({
    recentRepos: withoutThisRepo.slice(0, RECENT_LIMIT),
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  const parsed = parseRepoFromUrl(tab.url);
  if (!parsed) return;

  writeQueue = writeQueue
    .then(() => recordVisit(parsed))
    .catch((err) => console.error("Failed to record visit", err));
});
