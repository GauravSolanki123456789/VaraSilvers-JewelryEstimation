# Copy your development .env to the installed desktop app (run AFTER installing)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\copy-env-to-app.ps1

$source = Join-Path $PSScriptRoot "..\.env"
$destDir = Join-Path $env:APPDATA "Vara Silvers"
$dest = Join-Path $destDir ".env"

if (-not (Test-Path $source)) {
    Write-Host "ERROR: Source .env not found at $source" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item $source $dest -Force

Write-Host ""
Write-Host "SUCCESS: .env copied to:" -ForegroundColor Green
Write-Host "  $dest"
Write-Host ""
Write-Host "Now open Vara Silvers from the desktop shortcut or Start Menu."
Write-Host ""
