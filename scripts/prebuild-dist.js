/**
 * Free file locks before electron-builder repackages dist/win-unpacked.
 * Does NOT kill node.exe (would terminate this script).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function killProcess(imageName) {
    if (process.platform !== 'win32') return;
    try {
        execSync(`taskkill /F /IM "${imageName}"`, { stdio: 'ignore' });
        console.log(`[prebuild] Stopped ${imageName}`);
    } catch (_) {
        // not running
    }
}

killProcess('Vara Silvers.exe');
killProcess('electron.exe');

const winUnpacked = path.join(__dirname, '..', 'dist', 'win-unpacked');
if (!fs.existsSync(winUnpacked)) {
    console.log('[prebuild] dist/win-unpacked does not exist — nothing to clean');
    process.exit(0);
}

function removeWithRetry(dir, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log('[prebuild] Removed dist/win-unpacked');
            return true;
        } catch (error) {
            if (i === attempts) {
                // Rename locked folder so electron-builder can create a fresh one
                const backup = `${dir}-old-${Date.now()}`;
                try {
                    fs.renameSync(dir, backup);
                    console.log('[prebuild] Renamed locked folder to', backup);
                    return true;
                } catch (renameError) {
                    console.warn('[prebuild] Could not remove or rename dist/win-unpacked:', renameError.message);
                    console.warn('[prebuild] Close File Explorer on dist/, quit Vara Silvers, then run npm run dist again.');
                    return false;
                }
            }
            try {
                execSync('timeout /t 2 /nobreak >nul', { stdio: 'ignore' });
            } catch (_) {
                /* ignore */
            }
        }
    }
    return false;
}

removeWithRetry(winUnpacked);
