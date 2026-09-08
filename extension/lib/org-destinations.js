// Where an organization row points.
//
// The obvious URL for an org's repo list is /orgs/{name}/repositories, but that
// 404s for a personal account, so anyone who added their own username got a row
// that always failed. The ?tab= form resolves for both, which removes the need
// to tell organizations and users apart at all, and lets people add their own
// account for quick access to their personal repos.
export const ORG_DESTINATIONS = {
  overview: (name) => `https://github.com/${encodeURIComponent(name)}`,
  repos: (name) => `https://github.com/${encodeURIComponent(name)}?tab=repositories`,
  projects: (name) => `https://github.com/${encodeURIComponent(name)}?tab=projects`,
};
