# publish-release.ps1 — Build + publish GitHub release for client auto-update
#
# BEFORE FIRST USE:
#   1. Bump "version" in package.json (e.g. 2.5.0 -> 2.5.1)
#   2. Set GitHub token:  $env:GH_TOKEN = "ghp_your_token_here"
#   3. git commit && git push your code changes
#
# THEN RUN:
#   .\publish-release.ps1
#
# Client: opens app -> update prompt appears (or restart app).
# Client .env is NOT overwritten — only app code updates.

param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:GH_TOKEN) {
    Write-Host "ERROR: Set GH_TOKEN first (GitHub Personal Access Token with repo scope)." -ForegroundColor Red
    Write-Host '  $env:GH_TOKEN = "ghp_..."' -ForegroundColor Yellow
    exit 1
}

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
Write-Host "`n=== Publish Vara Silvers v$($pkg.version) to GitHub ===" -ForegroundColor Cyan

if (-not $SkipBuild) {
    & "$PSScriptRoot\clean-and-build.ps1"
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "`nUploading release to GitHub (electron-builder publish)..."
npx electron-builder --config.directories.output=build-out --publish always
if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed. Check GH_TOKEN and repo access." -ForegroundColor Red
    exit 1
}

Write-Host "`nPublished v$($pkg.version). Client apps will detect update on next launch." -ForegroundColor Green
Write-Host "Repo: https://github.com/GauravSolanki123456789/VaraSilvers-JewelryEstimation/releases" -ForegroundColor Gray
