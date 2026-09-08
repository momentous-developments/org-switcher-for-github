import { ORG_SLUG_PATTERN } from "./org-slug.js";

// Top-level paths on github.com that are site routes rather than accounts, so
// we don't record github.com/settings/profile as a repo called
// "settings/profile". This is a blocklist and blocklists drift, which is why
// parseRepoFromUrl also shape-checks both segments below.
//
// Every name here was checked against the GitHub API. "git" was removed after
// that check: it is a real organisation, and git/git is a repo people actually
// visit. "assets", "customer-stories" and "watching" stay, because they are
// github.com routes first and near-empty squatted accounts second.
export const RESERVED_OWNERS = new Set([
  "about", "account", "advisories", "apps", "assets", "blog", "business",
  "codespaces", "collections", "contact", "copilot", "customer-stories",
  "dashboard", "discussions", "education", "enterprise", "events", "explore",
  "features", "home", "issues", "join", "login", "logout",
  "marketplace", "mobile", "new", "newsletter", "nonprofit", "notifications",
  "organizations", "orgs", "partners", "premium-support", "pricing",
  "projects", "pulls", "readme", "resources", "search", "security", "sessions",
  "settings", "signup", "site", "sitemap", "solutions", "sponsors", "stars",
  "support", "team", "teams", "topics", "tos", "trending", "users", "watching",
]);

// GitHub repository names allow letters, digits, dots, hyphens and
// underscores, up to 100 characters.
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

// Returns { owner, repo, key } for a repository URL, or null for anything
// else. `key` is lowercased so that /Octo-Org/Repo and /octo-org/repo are one
// entry rather than two; owner and repo keep the casing they were seen with,
// because that is what gets displayed.
export function parseRepoFromUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "github.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, repo] = parts;
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;
  if (!ORG_SLUG_PATTERN.test(owner)) return null;
  if (!REPO_NAME_PATTERN.test(repo)) return null;
  if (repo.startsWith(".")) return null;

  return { owner, repo, key: `${owner}/${repo}`.toLowerCase() };
}
