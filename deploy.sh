#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

readonly APP_NAME="yelyginn-site"
readonly LOCAL_ORIGIN="http://127.0.0.1:3000"
readonly BUILD_STARTED_AT="$(date +%s)"

# Never overwrite concurrent work or switch an unexpected checkout.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: dirty checkout; preserve changes before deploying." >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "ERROR: expected the server main checkout; no branch was switched." >&2
  exit 1
fi

readonly TASK_DEPLOY_STATE_DIR="$HOME/.local/state/yelyginn-deploy"
mkdir -p "$TASK_DEPLOY_STATE_DIR"
chmod 700 "$TASK_DEPLOY_STATE_DIR"
readonly TASK_DEPLOY_SNAPSHOT="$TASK_DEPLOY_STATE_DIR/$(date -u +%Y%m%d-%H%M%S)-$$"
if [[ -s dist/indexable-routes.json ]]; then
  node scripts/indexnow.mjs snapshot --dist dist --output "$TASK_DEPLOY_SNAPSHOT-before.json"
else
  node -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify({schema:1,origin:"https://yelyginn.ru",routes:[]}))' "$TASK_DEPLOY_SNAPSHOT-before.json"
fi

echo "==> Syncing main without discarding local commits"
git fetch origin --prune
git merge --ff-only origin/main

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

node scripts/indexnow.mjs snapshot --dist dist --output "$TASK_DEPLOY_SNAPSHOT-after.json"
node scripts/indexnow.mjs sitemap --dist dist --before "$TASK_DEPLOY_SNAPSHOT-before.json" --after "$TASK_DEPLOY_SNAPSHOT-after.json" --history "$TASK_DEPLOY_STATE_DIR/content-history.json" --output "$TASK_DEPLOY_SNAPSHOT-history.json"

echo "==> Restarting $APP_NAME"
pm2 restart "$APP_NAME" --update-env
pm2 save --force

# PROMPT-36 §5.2: проверка H1 — по ВСЕМ индексируемым маршрутам манифеста
# (dist/indexable-routes.json пишет scripts/prerender.ts), а не по списку,
# который вручную отстаёт от манифеста (раньше выпадали статьи блога).
# tests/seo.test.ts на VPS не запускается без проверки — оставлен grep.
mapfile -t PRERENDER_ROUTES < <(
  node -e 'for (const route of require("./dist/indexable-routes.json").routes) console.log(route)'
)
STATIC_PUBLIC_ROUTES=()

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

# A live HTTPS content/key preflight prevents announcing an unpublished build.
# A provider failure is journalled separately from the successful site release.
mv "$TASK_DEPLOY_SNAPSHOT-history.json" "$TASK_DEPLOY_STATE_DIR/content-history.json"
if ! node scripts/indexnow.mjs notify --before "$TASK_DEPLOY_SNAPSHOT-before.json" --after "$TASK_DEPLOY_SNAPSHOT-after.json" --journal "$TASK_DEPLOY_STATE_DIR/indexnow-results.jsonl" --submit; then
  echo "WARNING: IndexNow not accepted; inspect the journal and retry only this release notification." >&2
fi

echo "DEPLOYED_COMMIT=$(git rev-parse --short HEAD)"
echo "DEPLOYED_AT=$(date --iso-8601=seconds)"
