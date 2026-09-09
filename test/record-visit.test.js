// The service worker is the one place where a bug is invisible in normal use:
// a paused tracker and a working one look identical from the outside, and so do
// a deduping list and one quietly filling with repeats. This stubs the small
// part of the chrome API the worker touches and drives the real listener.

import test from "node:test";
import assert from "node:assert/strict";
import {
  HOSTNAME,
  UMAMI_ENDPOINT,
  WEBSITE_ID,
} from "../extension/lib/analytics.js";

function installChromeStub() {
  const sync = { trackingPaused: false };
  const local = { recentRepos: [] };
  const listeners = [];
  const messageListeners = [];
  const sent = [];
  const granted = { value: false };

  const read = (store, defaults) => {
    if (typeof defaults === "string") return { [defaults]: store[defaults] };
    const out = {};
    for (const [k, v] of Object.entries(defaults)) out[k] = k in store ? store[k] : v;
    return out;
  };

  globalThis.chrome = {
    storage: {
      sync: { get: async (d) => read(sync, d), set: async (o) => Object.assign(sync, o) },
      local: { get: async (d) => read(local, d), set: async (o) => Object.assign(local, o) },
    },
    tabs: { onUpdated: { addListener: (fn) => listeners.push(fn) } },
    runtime: { onMessage: { addListener: (fn) => messageListeners.push(fn) } },
    permissions: { contains: async () => granted.value },
  };

  globalThis.fetch = async (url, init) => {
    sent.push({ url, init });
    return { ok: true };
  };

  return {
    sync,
    local,
    sent,
    granted,
    async track(name, props) {
      for (const fn of messageListeners) fn({ type: "track", name, props });
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    },
    // A hard page load: status cycles to complete and the tab carries the URL.
    async visit(url, status = "complete") {
      for (const fn of listeners) fn(1, { status }, { url });
      // Let the worker's write queue drain.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    },
    // A Turbo navigation: only changeInfo.url, no status, and Chrome has not
    // updated tab.url yet at that point.
    async turboVisit(url) {
      for (const fn of listeners) fn(1, { url }, {});
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

const ctx = installChromeStub();
await import("../extension/background.js");

// GitHub navigates with Turbo, which fires onUpdated with changeInfo.url and
// never reaches status "complete". If this regresses, the recent list silently
// only catches repos opened from the address bar.
test("records a client-side navigation that never reports status complete", async () => {
  ctx.local.recentRepos = [];
  await ctx.turboVisit("https://github.com/octo-org/hello-world");
  assert.equal(
    ctx.local.recentRepos.length,
    1,
    "a Turbo navigation was not recorded"
  );
  assert.equal(ctx.local.recentRepos[0].key, "octo-org/hello-world");
});

test("a client-side navigation to a site route is still ignored", async () => {
  ctx.local.recentRepos = [];
  await ctx.turboVisit("https://github.com/settings/profile");
  assert.deepEqual(ctx.local.recentRepos, []);
});

test("the same repo seen as both a Turbo and a full load stays one entry", async () => {
  ctx.local.recentRepos = [];
  await ctx.turboVisit("https://github.com/octo-org/hello-world");
  await ctx.visit("https://github.com/octo-org/hello-world");
  assert.equal(ctx.local.recentRepos.length, 1);
});

test("records a visited repo", async () => {
  ctx.local.recentRepos = [];
  await ctx.visit("https://github.com/octo-org/hello-world");
  assert.equal(ctx.local.recentRepos.length, 1);
  assert.equal(ctx.local.recentRepos[0].key, "octo-org/hello-world");
});

test("ignores tabs that have not finished loading", async () => {
  ctx.local.recentRepos = [];
  await ctx.visit("https://github.com/octo-org/hello-world", "loading");
  assert.deepEqual(ctx.local.recentRepos, []);
});

test("ignores site routes that are not repositories", async () => {
  ctx.local.recentRepos = [];
  await ctx.visit("https://github.com/settings/profile");
  assert.deepEqual(ctx.local.recentRepos, []);
});

test("revisiting moves a repo to the top without duplicating it", async () => {
  ctx.local.recentRepos = [];
  await ctx.visit("https://github.com/octo-org/first");
  await ctx.visit("https://github.com/octo-org/second");
  await ctx.visit("https://github.com/octo-org/first");
  assert.deepEqual(
    ctx.local.recentRepos.map((r) => r.key),
    ["octo-org/first", "octo-org/second"]
  );
});

test("differing case counts as the same repo", async () => {
  ctx.local.recentRepos = [];
  await ctx.visit("https://github.com/Octo-Org/Repo");
  await ctx.visit("https://github.com/octo-org/repo");
  assert.equal(ctx.local.recentRepos.length, 1);
});

test("keeps at most fifteen entries", async () => {
  ctx.local.recentRepos = [];
  for (let i = 0; i < 20; i++) {
    await ctx.visit(`https://github.com/octo-org/repo-${i}`);
  }
  assert.equal(ctx.local.recentRepos.length, 15);
  assert.equal(ctx.local.recentRepos[0].key, "octo-org/repo-19");
});

test("records nothing while tracking is paused", async () => {
  ctx.local.recentRepos = [];
  ctx.sync.trackingPaused = true;
  await ctx.visit("https://github.com/octo-org/hello-world");
  assert.deepEqual(ctx.local.recentRepos, [], "paused tracker still recorded a visit");

  ctx.sync.trackingPaused = false;
  await ctx.visit("https://github.com/octo-org/hello-world");
  assert.equal(ctx.local.recentRepos.length, 1, "unpausing did not resume recording");
});

test("simultaneous navigations do not lose a write", async () => {
  ctx.local.recentRepos = [];
  // Fired back to back with no await between them, which is what two tabs
  // finishing at the same moment looks like.
  const urls = ["a", "b", "c"].map((n) => `https://github.com/octo-org/${n}`);
  urls.forEach((u) => ctx.visit(u));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(ctx.local.recentRepos.length, 3, "a concurrent write was lost");
});

test("a usage event is dropped while stats are switched off", async () => {
  ctx.sent.length = 0;
  ctx.local.analyticsEnabled = false;
  ctx.granted.value = true;
  await ctx.track("popup_opened", { orgs: "1-3" });
  assert.deepEqual(ctx.sent, [], "the switch alone must stop the send");
});

test("a usage event is dropped when the switch is on but Chrome has not granted the host", async () => {
  ctx.sent.length = 0;
  ctx.local.analyticsEnabled = true;
  ctx.granted.value = false;
  await ctx.track("popup_opened", { orgs: "1-3" });
  assert.deepEqual(ctx.sent, [], "a revoked permission must stop the send on its own");
});

test("a usage event is sent once, to Umami, when every gate passes", async () => {
  ctx.sent.length = 0;
  ctx.local.analyticsEnabled = true;
  ctx.granted.value = true;
  await ctx.track("org_opened", { via: "repos" });

  assert.equal(ctx.sent.length, 1, "exactly one request");
  const { url, init } = ctx.sent[0];
  assert.equal(url, UMAMI_ENDPOINT);
  assert.equal(init.method, "POST");

  const body = JSON.parse(init.body);
  assert.equal(body.type, "event");
  assert.equal(body.payload.website, WEBSITE_ID);
  assert.equal(body.payload.hostname, HOSTNAME);
  assert.equal(body.payload.name, "org_opened");
  assert.deepEqual(body.payload.data, { via: "repos" });

  // The whole promise of the feature, asserted rather than assumed: nothing in
  // what goes out can name an organization, a repo or an address.
  assert.equal(JSON.stringify(body).includes("github.com"), false);
  assert.deepEqual(Object.keys(body.payload).sort(), ["data", "hostname", "name", "url", "website"]);
});

test("a message that is not a usage event is ignored", async () => {
  ctx.sent.length = 0;
  ctx.local.analyticsEnabled = true;
  ctx.granted.value = true;
  await ctx.track(undefined, undefined);
  assert.deepEqual(ctx.sent, []);
});
