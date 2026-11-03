#!/usr/bin/env bash
# The Mindra API and its two workers for the journey tests, on a fresh database in e2e/.data each run, with a stand-in
# YouTube (youtube.mjs). Every outside service is a stand-in or switched off (no AI, transcription, image, posting,
# payment, email or platform calls leave this machine), so the tests are free and repeatable. Stopping this script
# stops the workers and the stand-in too.
set -euo pipefail
source "$(dirname "$0")/env.sh"

rm -rf "$DATA"
mkdir -p "$DATA/media"
"$PY" -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" >"$DATA/token-key"
source "$(dirname "$0")/env.sh"

cd "$BACKEND"
"$PY" manage.py migrate --noinput -v 0
trap 'kill 0' EXIT
# Their logs go to e2e/.data/, to read after a failure.
node "$HERE/servers/youtube.mjs" "$YOUTUBE_PORT" >>"$DATA/youtube.log" 2>&1 &
"$PY" manage.py db_worker --queue-name default --no-reload --no-startup-delay >>"$DATA/worker.log" 2>&1 &
"$PY" manage.py db_worker --queue-name renders --no-reload --no-startup-delay >>"$DATA/renders.log" 2>&1 &
"$PY" manage.py runserver "127.0.0.1:$API_PORT" --noreload --no-worker >>"$DATA/api.log" 2>&1
