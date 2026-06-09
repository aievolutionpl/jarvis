#!/usr/bin/env bash
# Installs a JARVIS launcher shortcut for the current macOS/Linux user.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
mkdir -p "$DESKTOP"

if [[ "$(uname -s)" == "Darwin" ]]; then
  SHORTCUT="$DESKTOP/JARVIS.command"
  cat > "$SHORTCUT" <<MAC
#!/usr/bin/env bash
cd "$ROOT"
./start.sh
MAC
  chmod +x "$SHORTCUT"
  echo "Installed macOS shortcut: $SHORTCUT"
else
  SHORTCUT="$DESKTOP/jarvis.desktop"
  cat > "$SHORTCUT" <<LINUX
[Desktop Entry]
Type=Application
Name=JARVIS by AI Evolution Labs
Comment=Launch JARVIS — Virtual AI Assistant
Exec=$ROOT/start.sh
Path=$ROOT
Terminal=true
Icon=utilities-terminal
Categories=Utility;Development;
LINUX
  chmod +x "$SHORTCUT"
  echo "Installed Linux desktop shortcut: $SHORTCUT"
fi
