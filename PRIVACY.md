# Privacy policy

**Org Switcher for GitHub**

Last updated: 9 September 2026

## The short version

Out of the box this extension sends nothing at all. It makes no network request
to anyone, including us, and it has no server of its own.

There is one switch that changes that, and it is off until you turn it on. If
you turn on **usage stats**, the extension sends anonymous counts of which of
its own features get used. It never sends the names of your organizations or
repos, the addresses you visit, or anything that identifies you. What it sends
is listed in full below.

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

## Usage stats, if you turn them on

The switch is on the settings page under **Usage stats**, and it is off unless
you turn it on. Turning it on asks Chrome for permission to contact
`cloud.umami.is`; declining that dialog leaves the switch off. Turning it off
again withdraws the permission and stops it immediately.

While it is on, these are the only things sent:

| Event | What goes with it |
|---|---|
| The first time you open the popup on a given day | Roughly how many organizations and favorites you have, in bands such as "4-6" |
| An organization was opened | Which button was used: the row, Overview, Repositories or Projects |
| A repo was opened | Whether it came from your favorites or your recent list |
| A repo was starred or unstarred | Whether it was added or removed |
| You reached the limit of five favorites | Nothing |
| Tracking was paused or resumed | Which of the two |
| A save to Chrome's storage failed | Nothing |

Counts are sent in bands rather than exactly, because an exact number is a
weak fingerprint once it sits alongside a few other details.

What is **never** sent, whatever the switch is set to: the name of any
organization, the name of any repo, any address you visit, the contents of any
page, or any identifier we have created for you.

The counts go to [Umami](https://umami.is), a privacy-focused analytics service,
who process them on our behalf. Umami sets no cookie and stores no identifier in
your browser. It counts visitors server-side from a hash of the site identifier,
the hostname and your browser's user agent, combined with a salt that is
rotated, and it does not store IP addresses. As with any request over the
internet, the IP address your request comes from is visible to the receiving
server while it is being handled.

## Permissions, and why each one is there

- **`storage`** so your organizations, favorites and recent list survive closing
  the browser.
- **`https://github.com/*`** so the extension can read the address of GitHub tabs
  you open, which is what produces the recent list.
- **`https://cloud.umami.is/*`**, optional and not requested at install. Chrome
  only asks for it if you turn on usage stats, and it is given up again when you
  turn them off.

There are no other permissions. There is no account, no sign-in and no token.

## Changes

If this policy ever changes, the updated version will be published here and the
date at the top will change.

## Contact

Questions about this policy can be raised as an issue on the project's GitHub
repository.

---

Unofficial. Not affiliated with, endorsed by, or sponsored by GitHub, Inc.
GitHub is a trademark of GitHub, Inc.
