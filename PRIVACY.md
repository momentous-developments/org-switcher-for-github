# Privacy policy

**Org Switcher for GitHub**

Last updated: 8 September 2026

## The short version

This extension does not collect your data, does not transmit it, and does not
send any network request to anyone, including us. It has no server. There is
nothing for us to see, because nothing ever reaches us.

## What the extension stores

Three things, all of them created by you using the extension:

1. **The list of organizations you add** on the settings page. Stored in Chrome's
   `storage.sync`, which means Chrome copies it between computers where you are
   signed in to the same Chrome profile. That copying is done by Chrome, not by
   us.
2. **The repos you have pinned as favorites.** Also stored in `storage.sync`, for
   the same reason.
3. **A list of up to fifteen recently visited GitHub repos.** Stored in Chrome's
   `storage.local`, which means it stays on the computer where it was recorded
   and is never copied anywhere.

## How the recent list is worked out

When a tab finishes loading a page on `github.com`, the extension reads that
tab's address and checks whether it looks like a repository page. If it does, it
records the owner and repository name. That is the only use of the
`github.com` host permission, and it is why the extension asks for that
permission rather than the much broader `tabs` permission, which would let it
see the address of every tab you open anywhere.

The extension never reads the content of a page, never makes a call to GitHub's
API, and never sees pages on any other site.

## Controlling the recent list

You control it from two places:

- **Pause**, at the bottom of the popup, stops anything new being added. The
  popup shows whether it is currently tracking or paused.
- **Clear recent history**, on the settings page, erases the list.

Removing the extension deletes everything it stored.

## Permissions, and why each one is there

- **`storage`** so your organizations, favorites and recent list survive closing
  the browser.
- **`https://github.com/*`** so the extension can read the address of GitHub tabs
  you open, which is what produces the recent list.

There are no other permissions. There is no account, no sign-in, no token and no
analytics.

## Changes

If this policy ever changes, the updated version will be published here and the
date at the top will change.

## Contact

Questions about this policy can be raised as an issue on the project's GitHub
repository.

---

Unofficial. Not affiliated with, endorsed by, or sponsored by GitHub, Inc.
GitHub is a trademark of GitHub, Inc.
