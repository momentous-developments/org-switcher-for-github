# Org Switcher for GitHub

Jump straight to any of your GitHub organizations, and to the repos you were
just in, from one click in the toolbar.

## Why

Getting from a repo in one organization to the repo list of another takes four
clicks on GitHub: Home, the switcher arrow, the organization, then Repositories.
This is a small popup that cuts it to two: the toolbar icon, then the
organization.

## What it does

- **Organizations.** Add them once in Settings, then click one to open its
  repository list. Hovering a row reveals shortcuts to that account's Overview,
  Repositories and Projects pages. Personal accounts work as well as
  organizations, so you can add your own username too.
- **Recent repos.** The five most recent repos you opened on github.com, listed
  automatically.
- **Favorites.** Star a repo to pin it, up to five. Favorites follow your Chrome
  profile between computers.

## Install

Coming to the Chrome Web Store.

To run it from source instead:

1. Download or clone this repository
2. Open `chrome://extensions`
3. Turn on **Developer mode**, top right
4. Click **Load unpacked** and select the `extension/` folder
5. Click the toolbar icon, then the gear, and add your first organization

## What it stores, and what it sends

It sends nothing unless you ask it to. There is no server, no account, no token
and no GitHub API call. Out of the box the extension makes no network requests
at all.

The one exception is a switch on the settings page, off unless you turn it on,
which sends anonymous counts of which features get used: that the popup was
opened, which button opened an organization, whether a repo came from
favorites or recents, and so on. It never sends the name of an organization or
repo, any address you visit, or anything identifying you. Turning it on is what
triggers Chrome to ask for permission to reach `cloud.umami.is`; the install
prompt only ever mentions github.com. The full list is in the
[privacy policy](PRIVACY.md).

It stores three things, all of them yours:

| What | Where | Leaves your computer? |
|---|---|---|
| Your list of organizations | `storage.sync` | Only as far as Chrome syncs your own profile |
| Pinned favorites | `storage.sync` | Same |
| Up to 15 recent repos | `storage.local` | No |

The recent list is built by reading the address of github.com tabs as they
finish loading, and keeping the ones that look like a repository page. That is
the only reason the extension asks for permission on `github.com`, and it is why
it asks for that rather than the much broader `tabs` permission, which would
expose the address of every tab you open anywhere. It never reads page content.

You can pause tracking from the popup itself, and clear the history from the
settings page, at any time. [Full privacy policy](PRIVACY.md).

## Development

There are no dependencies and no build step for the extension itself. It is
plain HTML, CSS and JavaScript that Chrome loads directly from `extension/`.

```sh
node --test    # runs the tests
./build.sh     # produces the Chrome Web Store zip in dist/
```

The tests cover the logic where a bug would otherwise be invisible: whether a
URL is a repository page, whether an organization slug is valid, where an
organization row points, what the service worker records, when the usage-stats
prompt appears, and exactly what a usage event may contain. Everything else is
DOM rendering, checked by loading the extension and using it.

```
extension/         the extension itself, loadable unpacked
  lib/             the pure modules, shared with the tests
test/              node --test
build.sh           produces dist/org-switcher-for-github-<version>.zip
```

## Credits

Designed and built through a conversation with Claude, including the parts where
it argued the other way: against OAuth for the first version, against resizing
the popup to fit long repo names, and against shipping a second Store listing
for the OAuth version later.

## License

[MIT](LICENSE), copyright Momentous Global Productions Ltd.

---

Unofficial. Not affiliated with, endorsed by, or sponsored by GitHub, Inc.
GitHub is a trademark of GitHub, Inc.
