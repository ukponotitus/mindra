#!/usr/bin/env bash
# The Mindra API and its two workers for the journey tests, on a fresh database in e2e/.data each run. Every outside
# service is a stand-in or switched off (no AI, transcription, image, posting, payment or email calls leave this
# machine), so the tests are free and repeatable. Stopping this script stops the workers too.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="${MINDRA_BACKEND:-$HERE/../../mindra-backend}"
PY="$BACKEND/.venv/bin/python"
DATA="$HERE/.data"
API_PORT="${E2E_API_PORT:-8030}"
APP_PORT="${E2E_APP_PORT:-5199}"

rm -rf "$DATA"
mkdir -p "$DATA/media"

export DATABASE_URL="sqlite:///$DATA/db.sqlite3" MEDIA_ROOT="$DATA/media" MEDIA_STORAGE=local
export DJANGO_DEBUG=1 TASKS_BACKEND=database MINDRA_DEV_WORKER=0
export AI_PROVIDER=fake TRANSCRIPTION_PROVIDER=fake AI_IMAGES_ENABLED=0
# Empty values win over the backend's .env, so no real key is ever used here.
export GEMINI_API_KEY= ANTHROPIC_API_KEY= DEEPGRAM_API_KEY= ELEVENLABS_API_KEY= JAMENDO_CLIENT_ID= PAYSTACK_SECRET_KEY=
export SENTRY_DSN= EMAIL_HOST= BETA_INVITE_CODES= VAPID_PRIVATE_KEY= VAPID_PUBLIC_KEY=
export FRONTEND_URL="http://127.0.0.1:$APP_PORT" API_URL="http://127.0.0.1:$API_PORT" CORS_ALLOWED_ORIGINS="http://127.0.0.1:$APP_PORT"
export AUTOMATIONS_WORKSPACES='*'

cd "$BACKEND"
"$PY" manage.py migrate --noinput -v 0
trap 'kill 0' EXIT
# Their logs go to e2e/.data/, to read after a failure.
"$PY" manage.py db_worker --queue-name default --no-reload --no-startup-delay >>"$DATA/worker.log" 2>&1 &
"$PY" manage.py db_worker --queue-name renders --no-reload --no-startup-delay >>"$DATA/renders.log" 2>&1 &
"$PY" manage.py runserver "127.0.0.1:$API_PORT" --noreload --no-worker >>"$DATA/api.log" 2>&1
