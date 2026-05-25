@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   Vara Silvers - Desktop Deployment Setup
echo ============================================
echo.

set "SCRIPT_DIR=%~dp0"

if exist "%SCRIPT_DIR%postgresql-installer.exe" (
    echo [1/3] Installing PostgreSQL...
    echo       This may take several minutes. Please wait.
    start /wait "" "%SCRIPT_DIR%postgresql-installer.exe" --mode unattended --superpassword "postgres" --servicename "postgresql" --serviceaccount "postgres" --servicepassword "postgres"
    if errorlevel 1 (
        echo WARNING: PostgreSQL installer returned an error. You may need to install it manually.
    ) else (
        echo       PostgreSQL installation completed.
    )
) else (
    echo [1/3] Skipping PostgreSQL - place postgresql-installer.exe in this folder first.
)

echo.
if exist "%SCRIPT_DIR%VaraSilvers-Setup.exe" (
    echo [2/3] Installing Vara Silvers application...
    start /wait "" "%SCRIPT_DIR%VaraSilvers-Setup.exe"
    if errorlevel 1 (
        echo ERROR: Application installer failed.
        pause
        exit /b 1
    )
    echo       Application installed successfully.
) else (
    echo [2/3] Skipping app install - place VaraSilvers-Setup.exe in this folder first.
    echo       Build it with: npm run dist
)

echo.
echo [3/3] Post-install checklist:
echo   - Copy .env.example to the install folder and configure DATABASE_URL
echo   - Ensure PostgreSQL service is running
echo   - Launch the app from the desktop shortcut
echo.
echo Done!
pause
