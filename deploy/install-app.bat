@echo off
echo ============================================
echo   Install Vara Silvers (Desktop App)
echo ============================================
echo.

cd /d "%~dp0.."

if not exist "dist\Vara Silvers-Setup-2.5.0.exe" (
    echo ERROR: Installer not found. Run: npm run dist
    pause
    exit /b 1
)

echo Starting installer...
start /wait "" "%~dp0..\dist\Vara Silvers-Setup-2.5.0.exe"

echo.
echo After install completes:
echo 1. Open the install folder via Start Menu shortcut -^> Open file location
echo 2. Copy your .env file into that folder (unless installer created one)
echo 3. Double-click the Vara Silvers desktop shortcut
echo.
pause
