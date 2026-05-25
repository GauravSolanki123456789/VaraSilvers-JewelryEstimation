# clean-and-build.ps1 — Vara Silvers build helper
#
# USAGE (pick ONE):
#
#   A) .env change only (COMPANY_NAME, DATABASE_URL, etc.) — FAST, no rebuild:
#      npm run copy-env-appdata
#      taskkill /F /IM "Vara Silvers.exe" 2>$null; taskkill /F /IM node.exe 2>$null
#      npm run desktop
#
#   B) Code change — test in dev (no build):
#      npm run desktop
#
#   C) Code change — test packaged app on your laptop:
#      .\clean-and-build.ps1 -Run
#
#   D) Code change — upgrade installed app on your laptop (NO uninstall):
#      .\clean-and-build.ps1 -Install
#
#   E) Send to client — copy build-out\Vara Silvers-Setup-2.5.0.exe to USB
#      (or publish GitHub release for auto-update)

param(
    [switch]$Install,   # Run NSIS installer after build (upgrades in place)
    [switch]$Run        # Run build-out\win-unpacked exe after build (skip install)
)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

Write-Host "`n=== Vara Silvers - clean and build ===" -ForegroundColor Cyan

# 1. Kill every possible lock holder
Write-Host "[1/5] Stopping running app processes..."
taskkill /F /IM "Vara Silvers.exe" /T 2>$null | Out-Null
taskkill /F /IM "electron.exe" /T 2>$null | Out-Null
taskkill /F /IM "node.exe" /T 2>$null | Out-Null
Start-Sleep -Seconds 3

# 2. Clean old build folders (ignore errors if locked)
Write-Host "[2/5] Cleaning dist, build-out, release..."
Remove-Item -Recurse -Force dist, build-out, release -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 3. Build fresh installer
Write-Host "[3/5] Building installer (npm run dist:fresh)..."
npm run dist:fresh
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nBUILD FAILED. Close File Explorer windows on build-out/, kill Vara Silvers, retry." -ForegroundColor Red
    exit 1
}

# 4. Sync .env to AppData (for installed app + shortcuts)
Write-Host "[4/5] Copying .env to AppData..."
npm run copy-env-appdata

# 5. Launch
$version   = (Get-Content (Join-Path $PSScriptRoot "package.json") -Raw | ConvertFrom-Json).version
$installer = Join-Path $PSScriptRoot "build-out\Vara Silvers-Setup-$version.exe"
$unpacked  = Join-Path $PSScriptRoot "build-out\win-unpacked\Vara Silvers.exe"

if ($Install) {
    Write-Host "[5/5] Installing/upgrading (no uninstall needed)..."
    if (Test-Path $installer) {
        Start-Process $installer -Wait
        Write-Host "Done. Open Vara Silvers from Start Menu or desktop shortcut." -ForegroundColor Green
    } else {
        Write-Host "Installer not found: $installer" -ForegroundColor Red
        exit 1
    }
} elseif ($Run) {
    Write-Host "[5/5] Launching unpacked build..."
    if (Test-Path $unpacked) {
        Start-Process $unpacked
        Write-Host "Running: $unpacked" -ForegroundColor Green
    } else {
        Write-Host "Exe not found: $unpacked" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host '[5/5] Build complete.' -ForegroundColor Green
    Write-Host "  Installer: $installer"
    Write-Host "  Test exe:  $unpacked"
    Write-Host ''
    Write-Host 'Next: .\clean-and-build.ps1 -Run     (test without installing)'
    Write-Host '  or: .\clean-and-build.ps1 -Install  (upgrade Start Menu app)'
}

Write-Host ""
