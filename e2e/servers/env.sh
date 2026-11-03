# What the journey tests' API, workers and seed scripts share: where the backend is, the test database and the
# settings that keep every outside service off or a stand-in. Sourced by backend.sh and seed.sh.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${MINDRA_BACKEND:-$HERE/../../mindra-backend}"
PY="$BACKEND/.venv/bin/python"
DATA="$HERE/.data"
API_PORT="${E2E_API_PORT:-8030}"
APP_PORT="${E2E_APP_PORT:-5199}"
# The stand-in YouTube (servers/youtube.mjs).
YOUTUBE_PORT="${E2E_YOUTUBE_PORT:-$((API_PORT + 100))}"

export DATABASE_URL="sqlite:///$DATA/db.sqlite3" MEDIA_ROOT="$DATA/media" MEDIA_STORAGE=local
export DJANGO_DEBUG=1 TASKS_BACKEND=database MINDRA_DEV_WORKER=0
export AI_PROVIDER=fake TRANSCRIPTION_PROVIDER=fake AI_IMAGES_ENABLED=0
# Empty values win over the backend's .env, so no real key is ever used here.
export GEMINI_API_KEY= ANTHROPIC_API_KEY= DEEPGRAM_API_KEY= ELEVENLABS_API_KEY= JAMENDO_CLIENT_ID= PAYSTACK_SECRET_KEY=
export SENTRY_DSN= EMAIL_HOST= BETA_INVITE_CODES= VAPID_PRIVATE_KEY= VAPID_PUBLIC_KEY=
export FRONTEND_URL="http://127.0.0.1:$APP_PORT" API_URL="http://127.0.0.1:$API_PORT" CORS_ALLOWED_ORIGINS="http://127.0.0.1:$APP_PORT"
export AUTOMATIONS_WORKSPACES='*'
# YouTube is the stand-in (only honoured with DEBUG), and comments can be refreshed again at once.
export YOUTUBE_API_URL="http://127.0.0.1:$YOUTUBE_PORT/youtube/v3" COMMENTS_REFRESH_MINUTES=0
# A key made for each run (backend.sh), so seeded accounts' stand-in tokens can be stored encrypted.
if [ -f "$DATA/token-key" ]; then export TOKEN_ENCRYPTION_KEY="$(cat "$DATA/token-key")"; fi
