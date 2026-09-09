// The service worker is the one place where a bug is invisible in normal use:
// a paused tracker and a working one look identical from the outside, and so do
// a deduping list and one quietly filling with repeats. This stubs the small
// part of the chrome API the worker touches and drives the real listener.

import test from "node:test";
import assert from "node:assert/strict";

function installChromeStub() {
  const sync = { trackingPaused: false };
  const local = { recentRepos: [] };
  const listeners = [];
  const messageListeners = [];
  const sent = [];

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
    permissions: { contains: async () => true },
  };

  // Any request at all is a failure in these tests: the worker must not reach
  // the network with usage stats switched off.
  globalThis.fetch = async (url) => {
    sent.push(url);
    return { ok: true };
  };

  return {
    sync,
    local,
    sent,
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
  ctx.local.analyticsEnabled = false;
  await ctx.track("popup_opened", { orgs: "1-3" });
  assert.deepEqual(ctx.sent, [], "nothing should reach the network");
});

test("a usage event is still dropped when the switch is on but nothing is configured", async () => {
  ctx.local.analyticsEnabled = true;
  await ctx.track("popup_opened", { orgs: "1-3" });
  assert.deepEqual(ctx.sent, [], "an unset website id must stop the send on its own");
  ctx.local.analyticsEnabled = false;
});

test("a message that is not a usage event is ignored", async () => {
  await ctx.track(undefined, undefined);
  assert.deepEqual(ctx.sent, []);
});
