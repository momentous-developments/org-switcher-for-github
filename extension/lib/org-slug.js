// GitHub's own rule for account names: 1-39 characters, letters, digits and
// hyphens, may not start or end with a hyphen. Shared by the settings page
// (validating what the user types) and the recent-repo parser (sanity-checking
// the owner segment of a URL).
export const ORG_SLUG_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

// Path prefixes where the account name is the *second* segment rather than the
// first. This matters most for "orgs": github.com/orgs/{name}/repositories is
// the URL this extension itself opens, so it is the likeliest thing anyone
// pastes back in, and reading the first segment turned it into an org called
// "orgs".
const ACCOUNT_IN_SECOND_SEGMENT = new Set(["orgs", "users"]);

// Accepts a bare slug or any github.com URL naming an account, and returns the
// slug. Handles a missing protocol, a www. prefix, deeper paths, query strings
// and fragments, because all of those are things people really paste.
export function normalizeOrgInput(raw) {
  const withoutHost = String(raw)
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\/+/i, "");

  const path = withoutHost.split(/[?#]/)[0];
  const parts = path.split("/").filter((s) => s.trim() !== "");

  if (parts.length > 1 && ACCOUNT_IN_SECOND_SEGMENT.has(parts[0].toLowerCase())) {
    return parts[1].trim();
  }
  return (parts[0] || "").trim();
}
