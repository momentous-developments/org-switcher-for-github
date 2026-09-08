// A wrong URL shape is invisible until someone clicks and gets a 404, which is
// exactly how the /orgs/{name}/... form shipped: fine for organizations, broken
// for every personal account.

import test from "node:test";
import assert from "node:assert/strict";
import { ORG_DESTINATIONS } from "../extension/lib/org-destinations.js";

test("uses the ?tab= form, which resolves for users as well as organizations", () => {
  assert.equal(ORG_DESTINATIONS.repos("nasa"), "https://github.com/nasa?tab=repositories");
  assert.equal(ORG_DESTINATIONS.projects("nasa"), "https://github.com/nasa?tab=projects");
  assert.equal(ORG_DESTINATIONS.overview("nasa"), "https://github.com/nasa");
});

test("never emits the /orgs/ form, which 404s for a personal account", () => {
  for (const build of Object.values(ORG_DESTINATIONS)) {
    assert.ok(
      !build("sindresorhus").includes("/orgs/"),
      "a destination still uses the organization-only path"
    );
  }
});

test("escapes the account name", () => {
  assert.equal(
    ORG_DESTINATIONS.repos("a b&c"),
    "https://github.com/a%20b%26c?tab=repositories"
  );
});
