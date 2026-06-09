#!/usr/bin/env bash
# JARVIS macOS/Linux launcher — prepares .env, installs deps, and starts backend/frontend.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example. Add API keys in onboarding or edit .env manually."
fi

if [[ -x "$ROOT/scripts/install_desktop_shortcut.sh" ]]; then
  "$ROOT/scripts/install_desktop_shortcut.sh" || true
fi

python -m pip install -r "$ROOT/requirements.txt"
(
  cd "$ROOT/frontend"
  npm install
)

python "$ROOT/server.py" &
BACKEND_PID=$!
(
  cd "$ROOT/frontend"
  npm run dev
) &
FRONTEND_PID=$!

cat <<MSG
JARVIS is starting.
Open Chrome at http://localhost:5173 (or the Vite URL printed above).
Backend PID: $BACKEND_PID
Frontend PID: $FRONTEND_PID
Press Ctrl+C here to stop both.
MSG

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM EXIT
wait
