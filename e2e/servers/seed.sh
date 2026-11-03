#!/usr/bin/env bash
# Puts what a journey test can't make through the app into the test database: `seed.sh youtube-post <email>` connects
# a stand-in YouTube channel to the person's workspace with a published Short that Mindra follows (seed.py).
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$BACKEND"
SEED_WHAT="$1" SEED_EMAIL="$2" "$PY" manage.py shell -v 0 -c "$(cat "$HERE/servers/seed.py")"
