import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRepoFromUrl,
  RESERVED_OWNERS,
} from "../extension/lib/parse-repo-url.js";

test("reads owner and repo from a repository URL", () => {
  assert.deepEqual(parseRepoFromUrl("https://github.com/octo-org/hello-world"), {
    owner: "octo-org",
    repo: "hello-world",
    key: "octo-org/hello-world",
  });
});

test("keeps the repository when the URL points deeper into it", () => {
  for (const path of [
    "/octo-org/hello-world/pull/42",
    "/octo-org/hello-world/blob/main/README.md",
    "/octo-org/hello-world/issues?q=is%3Aopen",
    "/octo-org/hello-world#readme",
  ]) {
    assert.equal(
      parseRepoFromUrl(`https://github.com${path}`)?.repo,
      "hello-world",
      `expected a repo for ${path}`
    );
  }
});

test("lowercases the key but keeps the casing that was seen for display", () => {
  const result = parseRepoFromUrl("https://github.com/Octo-Org/Hello-World");
  assert.equal(result.key, "octo-org/hello-world");
  assert.equal(result.owner, "Octo-Org");
  assert.equal(result.repo, "Hello-World");
});

test("the same repo in different casing produces one key", () => {
  assert.equal(
    parseRepoFromUrl("https://github.com/Octo-Org/Repo").key,
    parseRepoFromUrl("https://github.com/octo-org/repo").key
  );
});

// The failure this guards against is silent: a broken filter does not throw,
// it just quietly records site pages as repositories.
test("ignores github.com site routes rather than treating them as repos", () => {
  for (const path of [
    "/settings/profile",
    "/notifications/subscriptions",
    "/orgs/octo-org/repositories",
    "/orgs/octo-org/projects",
    "/marketplace/actions/checkout",
    "/topics/javascript",
    "/sponsors/octo-org",
    "/search?q=chrome+extension",
    "/codespaces/new",
    "/new/import",
    "/apps/dependabot",
    "/users/octocat",
    "/discussions/12345",
  ]) {
    assert.equal(
      parseRepoFromUrl(`https://github.com${path}`),
      null,
      `expected null for ${path}`
    );
  }
});

// "git" is a real organisation, and git/git is a repo people visit. It was on
// the blocklist until every entry was checked against the GitHub API.
test("does not block real accounts whose names look like site routes", () => {
  assert.deepEqual(parseRepoFromUrl("https://github.com/git/git"), {
    owner: "git",
    repo: "git",
    key: "git/git",
  });
});

test("the reserved list has no duplicates and is all lowercase", () => {
  for (const entry of RESERVED_OWNERS) {
    assert.equal(entry, entry.toLowerCase(), `${entry} should be lowercase`);
  }
  assert.ok(RESERVED_OWNERS.size > 40);
});

test("ignores anything that is not an https github.com page", () => {
  for (const url of [
    "https://gist.github.com/octo-org/abc123",
    "https://github.io/octo-org/repo",
    "https://notgithub.com/octo-org/repo",
    "http://github.com/octo-org/repo",
    "chrome://extensions",
    "about:blank",
    "not a url at all",
    "",
  ]) {
    assert.equal(parseRepoFromUrl(url), null, `expected null for ${url}`);
  }
});

test("ignores paths that cannot be a repository", () => {
  for (const path of [
    "/",
    "/octo-org",
    "/octo-org/",
    "/-leading-hyphen/repo",
    "/trailing-hyphen-/repo",
    "/has_underscore/repo",
    "/octo-org/.hidden",
    "/octo-org/..",
  ]) {
    assert.equal(
      parseRepoFromUrl(`https://github.com${path}`),
      null,
      `expected null for ${path}`
    );
  }
});

test("accepts repository names with dots, hyphens and underscores", () => {
  for (const name of ["docs.github.com", "my_repo", "my-repo", "v2.0.1"]) {
    assert.equal(
      parseRepoFromUrl(`https://github.com/octo-org/${name}`)?.repo,
      name
    );
  }
});
