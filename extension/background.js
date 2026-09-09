// Records repos the user visits on github.com so the popup can show a "Recent"
// list. No GitHub API calls are made: this only reads the tab's own URL, which
// the github.com host permission already covers.
//
// It is also where usage events are sent from, when the user has turned them
// on. They are sent from here rather than from the popup because clicking a
// row opens a tab and closes the popup, which would cancel a fetch started
// there. The worker outlives the click.

import { parseRepoFromUrl } from "./lib/parse-repo-url.js";
import {
  UMAMI_ENDPOINT,
  UMAMI_ORIGIN,
  WEBSITE_ID,
  buildPayload,
  canSend,
} from "./lib/analytics.js";

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

// Every gate has to pass, and they are checked in this order deliberately: the
// switch is what the user set, the permission is what Chrome actually granted,
// and they can disagree if the permission was revoked from Chrome's own
// settings rather than from ours.
async function analyticsAllowed() {
  const { analyticsEnabled } = await chrome.storage.local.get({
    analyticsEnabled: false,
  });
  const granted = await chrome.permissions.contains({ origins: [UMAMI_ORIGIN] });
  return canSend({
    websiteId: WEBSITE_ID,
    enabled: analyticsEnabled,
    granted,
  });
}

async function sendEvent(name, props) {
  if (!(await analyticsAllowed())) return;
  try {
    await fetch(UMAMI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(name, props)),
    });
  } catch (err) {
    // Counting how the extension gets used must never be able to stop it
    // working. A refused or offline request is dropped and nothing retries.
    console.debug("Usage event not sent", err);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "track" || typeof message.name !== "string") return;
  sendEvent(message.name, message.props || {});
  // No response is sent, so the channel is not held open.
});
