# JARVIS Windows launcher — prepares installation, creates a Desktop shortcut,
# then starts backend and frontend in separate PowerShell windows.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ShortcutName = "JARVIS by AI Evolution Labs.lnk"

function New-JarvisDesktopShortcut {
  param([string]$ProjectRoot)

  try {
    $desktop = [Environment]::GetFolderPath("Desktop")
    if ([string]::IsNullOrWhiteSpace($desktop) -or -not (Test-Path $desktop)) {
      Write-Host "Desktop folder was not found; skipping shortcut creation."
      return
    }

    $shortcutPath = Join-Path $desktop $ShortcutName
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$ProjectRoot\start.ps1`""
    $shortcut.WorkingDirectory = $ProjectRoot
    $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
    $shortcut.Description = "Launch JARVIS by AI Evolution Labs"
    $shortcut.Save()
    Write-Host "Desktop shortcut ready: $shortcutPath"
  }
  catch {
    Write-Warning "Could not create desktop shortcut: $($_.Exception.Message)"
  }
}

if (-not (Test-Path "$Root\.env") -and (Test-Path "$Root\.env.example")) {
  Copy-Item "$Root\.env.example" "$Root\.env"
  Write-Host "Created .env from .env.example. Add your API keys in onboarding or edit the file manually."
}

New-JarvisDesktopShortcut -ProjectRoot $Root

Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root'; python -m pip install -r requirements.txt; python server.py")
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd '$Root\frontend'; npm install; npm run dev")
Write-Host "JARVIS is starting. Open Chrome at http://localhost:5173"
Write-Host "AI Evolution Labs: https://aievolutionlabs.io/"
