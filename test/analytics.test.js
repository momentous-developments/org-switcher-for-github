// The usage-stats payload is the one place a privacy promise could quietly
// break: a stray property carrying an org name would look exactly like a
// working feature. These pin the shape of what goes out.

import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_SCREENS,
  HOSTNAME,
  bucketFavorites,
  bucketOrgs,
  buildPayload,
  canSend,
  isNewDay,
  todayStamp,
} from "../extension/lib/analytics.js";

test("org counts go out in bands, never exact", () => {
  assert.equal(bucketOrgs(0), "0");
  assert.equal(bucketOrgs(1), "1-3");
  assert.equal(bucketOrgs(3), "1-3");
  assert.equal(bucketOrgs(4), "4-6");
  assert.equal(bucketOrgs(6), "4-6");
  assert.equal(bucketOrgs(7), "7-10");
  assert.equal(bucketOrgs(10), "7-10");
  assert.equal(bucketOrgs(11), "11+");
  assert.equal(bucketOrgs(400), "11+");
});

test("favorite counts go out in bands", () => {
  assert.equal(bucketFavorites(0), "0");
  assert.equal(bucketFavorites(2), "1-2");
  assert.equal(bucketFavorites(5), "3-5");
});

test("a missing or nonsense count is treated as zero, not as NaN", () => {
  assert.equal(bucketOrgs(undefined), "0");
  assert.equal(bucketOrgs(NaN), "0");
  assert.equal(bucketFavorites(undefined), "0");
});

test("every event name has a screen, and an unknown one is refused", () => {
  for (const name of Object.keys(EVENT_SCREENS)) {
    assert.doesNotThrow(() => buildPayload(name, {}, "site-id"));
  }
  assert.throws(() => buildPayload("repo_name", {}, "site-id"), /Unknown analytics event/);
});

test("the payload carries only the event, the screen and the given properties", () => {
  const out = buildPayload("org_opened", { via: "repos" }, "site-id");
  assert.deepEqual(out, {
    type: "event",
    payload: {
      website: "site-id",
      hostname: HOSTNAME,
      url: "/org",
      name: "org_opened",
      data: { via: "repos" },
    },
  });
});

test("no data key at all when an event has no properties", () => {
  const out = buildPayload("favorite_limit_hit", {}, "site-id");
  assert.equal("data" in out.payload, false);
});

test("the screen name never carries anything the user typed", () => {
  for (const screen of Object.values(EVENT_SCREENS)) {
    assert.match(screen, /^\/[a-z/-]*$/);
  }
});

test("a new day is any stamp that differs from the last one seen", () => {
  assert.equal(isNewDay("", "2026-09-09"), true);
  assert.equal(isNewDay("2026-09-08", "2026-09-09"), true);
  assert.equal(isNewDay("2026-09-09", "2026-09-09"), false);
  assert.equal(isNewDay("2026-09-09", ""), false);
});

test("the day stamp is local and zero padded", () => {
  assert.equal(todayStamp(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(todayStamp(new Date(2026, 11, 31)), "2026-12-31");
});

test("nothing is sent unless the id, the switch and the permission all hold", () => {
  const combos = [
    [{ websiteId: "id", enabled: true, granted: true }, true],
    [{ websiteId: "", enabled: true, granted: true }, false],
    [{ websiteId: "id", enabled: false, granted: true }, false],
    [{ websiteId: "id", enabled: true, granted: false }, false],
    [{ websiteId: "", enabled: false, granted: false }, false],
  ];
  for (const [input, expected] of combos) {
    assert.equal(canSend(input), expected, JSON.stringify(input));
  }
});

test("a missing flag is not treated as permission", () => {
  assert.equal(canSend({ websiteId: "id", enabled: undefined, granted: true }), false);
  assert.equal(canSend({ websiteId: "id", enabled: true, granted: undefined }), false);
  assert.equal(canSend({}), false);
});
