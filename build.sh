#!/usr/bin/env bash
# Produces the zip that gets uploaded to the Chrome Web Store.
#
# Built by hand this file would be one .DS_Store away from shipping junk, which
# is the whole reason it exists. Everything is taken from extension/ and
# nothing else is included.
set -euo pipefail

cd "$(dirname "$0")"

MANIFEST="extension/manifest.json"

# Fail loudly on a manifest that does not parse, rather than shipping it.
python3 -m json.tool "$MANIFEST" > /dev/null

VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST" | head -1)
if [ -z "$VERSION" ]; then
  echo "Could not read version from $MANIFEST" >&2
  exit 1
fi

OUT="dist/org-switcher-for-github-${VERSION}.zip"

rm -rf dist
mkdir -p dist

# -X drops the macOS extra attributes that otherwise bloat the archive.
( cd extension && zip -qr -X "../$OUT" . -x '.*' -x '*/.*' -x '__MACOSX/*' )

echo "Built $OUT"
unzip -l "$OUT"
