#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

readonly APP_NAME="yelyginn-site"
readonly LOCAL_ORIGIN="http://127.0.0.1:3000"
readonly BUILD_STARTED_AT="$(date +%s)"

echo "==> Syncing main"
git fetch origin --prune
git switch main
git reset --hard origin/main

echo "==> Installing locked dependencies"
npm ci

echo "==> Building and prerendering"
npm run build

MANIFEST="dist/prerender-manifest.json"
INDEX_HTML="dist/prerender/index.html"

if [[ ! -s "$MANIFEST" ]]; then
  echo "ERROR: $MANIFEST was not generated; PM2 will not be restarted." >&2
  exit 1
fi

if (( $(stat -c %Y "$MANIFEST") < BUILD_STARTED_AT )); then
  echo "ERROR: $MANIFEST is older than this deployment; PM2 will not be restarted." >&2
  exit 1
fi

if ! grep -qiE '<h1([[:space:]>])' "$INDEX_HTML"; then
  echo "ERROR: $INDEX_HTML has no H1; PM2 will not be restarted." >&2
  exit 1
fi

echo "==> Restarting $APP_NAME"
pm2 restart "$APP_NAME" --update-env
pm2 save --force

mapfile -t PRERENDER_ROUTES < <(
  node -e 'for (const route of require("./dist/prerender-manifest.json").routes) console.log(route)'
)

# These public static pages are not rendered by the shared V3 manifest.
STATIC_PUBLIC_ROUTES=(
  /reklamnye-roliki
  /event-video
  /reels
  /ceny
  /photo
  /content-day
  /cvetokorrekciya
  /video-dlya-marketpleysov
)

declare -A SEEN_ROUTES=()
for route in "${PRERENDER_ROUTES[@]}" "${STATIC_PUBLIC_ROUTES[@]}"; do
  [[ -n "${SEEN_ROUTES[$route]:-}" ]] && continue
  SEEN_ROUTES["$route"]=1

  html=""
  for _attempt in {1..12}; do
    if html="$(curl --fail --silent --show-error "$LOCAL_ORIGIN$route")"; then
      break
    fi
    sleep 1
  done

  if [[ -z "$html" ]] || ! grep -qiE '<h1([[:space:]>])' <<<"$html"; then
    echo "ERROR: $route has no H1 from $LOCAL_ORIGIN after restart." >&2
    echo "Rollback is required; inspect the deployed commit before further changes." >&2
    exit 1
  fi
  echo "H1 OK: $route"
done

echo "DEPLOYED_COMMIT=$(git rev-parse --short HEAD)"
echo "DEPLOYED_AT=$(date --iso-8601=seconds)"
