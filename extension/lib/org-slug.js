// GitHub's own rule for account names: 1-39 characters, letters, digits and
// hyphens, may not start or end with a hyphen. Shared by the settings page
// (validating what the user types) and the recent-repo parser (sanity-checking
// the owner segment of a URL).
export const ORG_SLUG_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

// Accepts either a bare slug or a pasted org URL and returns the slug.
// "https://github.com/octo-org/repo" and "octo-org" both give "octo-org".
export function normalizeOrgInput(raw) {
  return String(raw)
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split("/")[0]
    .trim();
}
