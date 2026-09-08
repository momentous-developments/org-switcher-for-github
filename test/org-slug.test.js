import test from "node:test";
import assert from "node:assert/strict";
import { ORG_SLUG_PATTERN, normalizeOrgInput } from "../extension/lib/org-slug.js";

test("accepts valid GitHub account names", () => {
  for (const slug of ["octo-org", "a", "a1", "octocat", "a".repeat(39)]) {
    assert.ok(ORG_SLUG_PATTERN.test(slug), `${slug} should be valid`);
  }
});

test("rejects names GitHub itself would reject", () => {
  for (const slug of [
    "",
    "-leading",
    "trailing-",
    "has space",
    "has_underscore",
    "has.dot",
    "a".repeat(40),
  ]) {
    assert.ok(!ORG_SLUG_PATTERN.test(slug), `${slug} should be rejected`);
  }
});

test("takes the slug out of a pasted org URL", () => {
  for (const input of [
    "https://github.com/octo-org",
    "https://www.github.com/octo-org",
    "http://github.com/octo-org/",
    "HTTPS://GitHub.com/octo-org",
    "https://github.com/octo-org/some-repo/pull/1",
  ]) {
    assert.equal(normalizeOrgInput(input), "octo-org", `failed on ${input}`);
  }
});

// Every one of these is something a person could plausibly paste. The first
// is the URL this extension itself opens, and it used to be read as an
// organization called "orgs".
test("handles the URL shapes people actually paste", () => {
  const cases = {
    "https://github.com/orgs/octo-org/repositories": "octo-org",
    "https://github.com/orgs/octo-org/projects": "octo-org",
    "https://github.com/users/octocat/projects": "octocat",
    "github.com/octo-org": "octo-org",
    "www.github.com/octo-org": "octo-org",
    "https://github.com/octo-org?tab=repositories": "octo-org",
    "https://github.com/octo-org#readme": "octo-org",
    "https://github.com/octo-org/repo/pull/5": "octo-org",
    "https://github.com/octo-org/": "octo-org",
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(normalizeOrgInput(input), expected, `failed on ${input}`);
  }
});

test("returns nothing for input that names no account", () => {
  for (const input of ["", "   ", "https://github.com/", "github.com/"]) {
    assert.equal(normalizeOrgInput(input), "", `failed on ${JSON.stringify(input)}`);
  }
});

test("leaves a bare slug alone and trims stray whitespace", () => {
  assert.equal(normalizeOrgInput("octo-org"), "octo-org");
  assert.equal(normalizeOrgInput("  octo-org  "), "octo-org");
});
