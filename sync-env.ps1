# sync-env.ps1 — .env-only changes (COMPANY_NAME, DATABASE_URL, etc.)
# NO rebuild needed. Run this after editing .env in project root.

Set-Location $PSScriptRoot

Write-Host "`n=== Sync .env to AppData ===" -ForegroundColor Cyan
npm run copy-env-appdata

Write-Host "`nStopping app so it reloads .env on next launch..."
taskkill /F /IM "Vara Silvers.exe" /T 2>$null | Out-Null
taskkill /F /IM "electron.exe" /T 2>$null | Out-Null
taskkill /F /IM "node.exe" /T 2>$null | Out-Null

Write-Host "`nDone. Open the app again (Start Menu or npm run desktop)." -ForegroundColor Green
Write-Host "COMPANY_NAME is read from: $env:APPDATA\Vara Silvers\.env" -ForegroundColor Gray
