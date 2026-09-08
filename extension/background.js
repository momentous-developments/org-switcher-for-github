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
  // GitHub moves between pages with Turbo rather than full page loads, and a
  // History API navigation fires this listener with changeInfo.url and no
  // status cycle at all. Gating on status alone would miss every repo reached
  // by clicking a link on GitHub itself, which is most of them. Recording the
  // same URL twice is harmless: recordVisit is keyed and simply moves the
  // existing entry back to the top.
  const navigated = changeInfo.url !== undefined || changeInfo.status === "complete";
  if (!navigated) return;

  const url = changeInfo.url || tab.url;
  if (!url) return;

  const parsed = parseRepoFromUrl(url);
  if (!parsed) return;

  writeQueue = writeQueue
    .then(() => recordVisit(parsed))
    .catch((err) => console.error("Failed to record visit", err));
});
