#!/usr/bin/env bash
# Update the shopping list to the latest version from GitHub and restart it.
#
#   ~/apps/shop/update.sh
#
# Safe to run any time: your list lives in a Docker volume and is never touched,
# and any edits you made on this server (port, password in docker-compose.yml)
# are kept across the update.
set -euo pipefail

cd "$(dirname "$0")"
branch="${1:-main}"

echo "==> Checking for updates"
git fetch --quiet origin "$branch"
old="$(git rev-parse --short HEAD)"
new="$(git rev-parse --short "origin/$branch")"

if [ "$old" = "$new" ] && [ "${FORCE:-}" != "1" ]; then
  echo "Already up to date ($old). Run FORCE=1 $0 to rebuild anyway."
  exit 0
fi

stashed=0
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "==> Keeping your local edits:"
  git status --short --untracked-files=no
  git stash push --quiet --message "update.sh $(date +%F-%H%M)"
  stashed=1
fi

echo "==> Updating $old -> $new"
git log --oneline --no-merges "$old..origin/$branch" | sed 's/^/    /' || true
if ! git merge --ff-only --quiet "origin/$branch"; then
  [ "$stashed" = 1 ] && git stash pop --quiet
  echo "!! Couldn't update cleanly (this copy has its own commits). Nothing was changed." >&2
  exit 1
fi

if [ "$stashed" = 1 ] && ! git stash pop --quiet 2>/dev/null; then
  # The update touched the same lines you edited. Keep your copy of those files.
  conflicted="$(git diff --name-only --diff-filter=U)"
  git reset --quiet
  for f in $conflicted; do git checkout --quiet stash@{0} -- "$f"; done
  git reset --quiet
  git stash drop --quiet
  echo "!! The update also changed: $conflicted"
  echo "   Kept your version. Compare with the new one using: git diff origin/$branch -- $conflicted"
fi

config="$(docker compose config)"
if grep -qE 'APP_PASSWORD: "?change-me"?$' <<<"$config"; then
  echo "!! The password is still 'change-me'. Put your own in .env first:" >&2
  echo "     cp .env.example .env && nano .env" >&2
  echo "   The code is updated; run FORCE=1 $0 to restart once .env is set." >&2
  exit 1
fi

# A container with the same name that compose didn't start (e.g. an older "docker run")
# would block the restart. Replace it; the list is in the data volume, not the container.
name="$(sed -n 's/^ *container_name: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$config" | head -n1)"
if [ -n "$name" ] && docker container inspect "$name" >/dev/null 2>&1; then
  owner="$(docker container inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$name")"
  if [ -z "$owner" ]; then
    echo "==> Replacing the manually started '$name' container with the compose one"
    docker rm -f "$name" >/dev/null
  fi
fi

echo "==> Rebuilding and restarting"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

echo "==> Waiting for it to come up"
for _ in $(seq 1 30); do
  ids="$(docker compose ps -q)"
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $ids 2>/dev/null | sort -u | tr '\n' ' ')"
  case "$status" in
    "healthy "|"running ") echo "Done. Now running $new. Reload the app on your phone to see it."; docker compose ps; exit 0 ;;
    *unhealthy*|*exited*) break ;;
  esac
  sleep 2
done

echo "!! It didn't come up healthy. Recent logs:" >&2
docker compose logs --tail 30 >&2
exit 1
