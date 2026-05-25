# publish-release.ps1 — Build + publish GitHub release for client auto-update
#
# BEFORE FIRST USE:
#   1. Bump "version" in package.json (e.g. 2.5.1 -> 2.5.2) — REQUIRED every release
#   2. Set GitHub token:  $env:GH_TOKEN = "ghp_your_token_here"
#   3. Add to client .env: GITHUB_UPDATE_TOKEN (read-only PAT, repo scope)
#   4. git commit && git push your code changes
#
# THEN RUN:
#   .\publish-release.ps1
#
# Client: opens installed app -> update prompt within ~5 seconds (or use Check for Updates).

param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$repoOwner = "GauravSolanki123456789"
$repoName = "VaraSilvers-JewelryEstimation"

if (-not $env:GH_TOKEN) {
    Write-Host "ERROR: Set GH_TOKEN first (GitHub Personal Access Token with repo scope)." -ForegroundColor Red
    Write-Host '  $env:GH_TOKEN = "ghp_..."' -ForegroundColor Yellow
    exit 1
}

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$version = $pkg.version
$tag = "v$version"

Write-Host "`n=== Publish Vara Silvers v$version to GitHub ===" -ForegroundColor Cyan

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

Write-Host "`nEnsuring GitHub release is Published (not Draft)..."
$headers = @{
    Authorization = "Bearer $env:GH_TOKEN"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

try {
    $release = Invoke-RestMethod `
        -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/tags/$tag" `
        -Headers $headers

    if ($release.draft -or $release.prerelease) {
        $body = @{
            draft = $false
            prerelease = $false
            make_latest = $true
        } | ConvertTo-Json

        Invoke-RestMethod `
            -Method PATCH `
            -Uri "https://api.github.com/repos/$repoOwner/$repoName/releases/$($release.id)" `
            -Headers $headers `
            -Body $body `
            -ContentType "application/json" | Out-Null

        Write-Host "Release $tag changed from Draft -> Published." -ForegroundColor Green
    } else {
        Write-Host "Release $tag is already published." -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Could not verify/publish release on GitHub: $_" -ForegroundColor Yellow
    Write-Host "Open GitHub Releases and click 'Publish release' manually if it shows Draft." -ForegroundColor Yellow
}

Write-Host "`nPublished v$version." -ForegroundColor Green
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Client .env needs: GITHUB_UPDATE_TOKEN=<read-only PAT> (private repo)" -ForegroundColor Yellow
Write-Host "  2. Installed app must be older version OR run: .\clean-and-build.ps1 -Install" -ForegroundColor Yellow
Write-Host "  3. npm start = dev mode (always latest code). Start Menu app = packaged build." -ForegroundColor Yellow
Write-Host "Repo: https://github.com/$repoOwner/$repoName/releases" -ForegroundColor Gray
