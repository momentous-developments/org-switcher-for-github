// Anonymous usage counts, off unless the user turns them on.
//
// Nothing here touches the chrome API or the network: the pure parts live
// where they can be tested, and background.js does the sending. The rule the
// whole feature is built around is that we never learn *what* anyone looks
// at, only *which parts of this extension* get used. No org name, no repo
// name, no URL, nothing that identifies a person, ever leaves the machine.

// Paste the Website ID from Umami (Settings -> Websites -> your site -> Edit).
// While this is empty nothing is ever sent, whatever the setting says.
export const WEBSITE_ID = "";

export const UMAMI_HOST = "https://cloud.umami.is";
export const UMAMI_ORIGIN = `${UMAMI_HOST}/*`;
export const UMAMI_ENDPOINT = `${UMAMI_HOST}/api/send`;

// Umami is built for websites, so every event carries a url. We use it as a
// screen name, which is what makes its dashboard readable for something that
// has no pages of its own.
export const EVENT_SCREENS = {
  popup_opened: "/popup",
  org_opened: "/org",
  repo_opened: "/repo",
  favorite_toggled: "/favorite",
  favorite_limit_hit: "/favorite/limit",
  tracking_toggled: "/tracking",
  sync_write_failed: "/error/sync-write",
};

export const HOSTNAME = "org-switcher-for-github";

// Counts go out in bands. An exact count is a weak fingerprint once it sits
// next to a few other properties, and "4 to 6" answers the same question as
// "5" for anything we would actually act on.
export function bucketOrgs(n) {
  const count = Number.isFinite(n) ? n : 0;
  if (count <= 0) return "0";
  if (count <= 3) return "1-3";
  if (count <= 6) return "4-6";
  if (count <= 10) return "7-10";
  return "11+";
}

export function bucketFavorites(n) {
  const count = Number.isFinite(n) ? n : 0;
  if (count <= 0) return "0";
  if (count <= 2) return "1-2";
  return "3-5";
}

// The popup gets opened dozens of times a day. Counting every one of those
// burns the monthly event allowance to tell us something we would not act on;
// counting the first open of each day gives us daily active use, which is the
// number the question was really about.
export function isNewDay(lastDay, today) {
  return typeof today === "string" && today !== "" && lastDay !== today;
}

export function todayStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The three conditions that must all hold before anything is sent, kept
// together and pure so every combination can be tested. They can disagree:
// the switch is ours, the permission is Chrome's, and a permission revoked
// from Chrome's own settings page leaves the switch on with nothing granted.
export function canSend({ websiteId, enabled, granted }) {
  return Boolean(websiteId) && enabled === true && granted === true;
}

export function buildPayload(eventName, props = {}, websiteId = WEBSITE_ID) {
  const screen = EVENT_SCREENS[eventName];
  if (!screen) throw new Error(`Unknown analytics event: ${eventName}`);
  const payload = {
    website: websiteId,
    hostname: HOSTNAME,
    url: screen,
    name: eventName,
  };
  // Umami rejects an empty data object on some versions, so only attach one
  // when there is something in it.
  if (Object.keys(props).length > 0) payload.data = { ...props };
  return { type: "event", payload };
}
