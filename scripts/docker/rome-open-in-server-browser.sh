#!/usr/bin/env bash
# Default-browser handler for Rome containers, wired up via the BROWSER env
# var baked into the image (see the Dockerfiles — the xdg mimeapps route is
# not viable because xdg-open ignores mimeapps without $DISPLAY). Any URL
# open — xdg-open's fallback, a CLI's OAuth flow shelling out to the system
# browser (codex login, claude /login, gh auth login, …) — lands here, and we
# open it as a new tab in the server-side Chrome over CDP: the same browser
# the noVNC desktop shows, with whatever sessions it already holds.
set -euo pipefail

url="${1:?usage: rome-open-in-server-browser <url>}"
cdp_host="${ROME_CHROME_CDP_HOST:-127.0.0.1}"
cdp_port="${ROME_CHROME_CDP_PORT:-9222}"

# `--data-urlencode "=$url"` URL-encodes the whole argument (the leading `=`
# means "no name, encode everything"), and -G moves it onto the query string,
# so &/#/? in the URL survive. Newer Chrome requires PUT /json/new and older
# builds only accept GET — try PUT first, mirroring desktop.ts.
curl -fsS -X PUT -G "http://${cdp_host}:${cdp_port}/json/new" --data-urlencode "=${url}" >/dev/null ||
  curl -fsS -G "http://${cdp_host}:${cdp_port}/json/new" --data-urlencode "=${url}" >/dev/null
