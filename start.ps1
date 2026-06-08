# JARVIS Windows launcher — starts backend and frontend in separate PowerShell windows.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$Root\.env") -and (Test-Path "$Root\.env.example")) {
  Copy-Item "$Root\.env.example" "$Root\.env"
  Write-Host "Created .env from .env.example. Add your API keys in onboarding or edit the file manually."
}

$ShortcutScript = Join-Path $Root "scripts\install_desktop_shortcut.ps1"
if ($IsWindows -or $env:OS -eq "Windows_NT") {
  try {
    if (Test-Path $ShortcutScript) {
      & $ShortcutScript | Out-Host
    }
  } catch {
    Write-Warning "Could not install desktop shortcut: $($_.Exception.Message)"
  }
}

Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root'; python -m pip install -r requirements.txt; python server.py")
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root\frontend'; npm install; npm run dev")
Write-Host "JARVIS is starting. Open Chrome at http://localhost:5173"
