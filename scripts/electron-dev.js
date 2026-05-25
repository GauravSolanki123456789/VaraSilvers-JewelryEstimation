/**
 * Dev desktop launcher — starts server, waits for /api/health, opens Electron.
 * Uses the real electron.exe path (reliable on Windows/Cursor terminal).
 */
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const projectRoot = path.join(__dirname, '..');
const port = process.env.PORT || '3001';
const healthUrl = `http://localhost:${port}/api/health`;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electronExe = require('electron');

let serverProcess = null;
let electronProcess = null;
let shuttingDown = false;

function waitForHealth(maxAttempts = 120) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = () => {
            attempts += 1;
            const request = http.get(healthUrl, (response) => {
                response.resume();
                if (response.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            });

            request.on('error', retry);
            request.setTimeout(2000, () => {
                request.destroy();
                retry();
            });
        };

        const retry = () => {
            if (attempts >= maxAttempts) {
                reject(new Error(`Server did not respond at ${healthUrl} within ${maxAttempts}s`));
                return;
            }
            setTimeout(check, 1000);
        };

        check();
    });
}

function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;

    if (electronProcess && !electronProcess.killed) {
        try { electronProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }
    }

    if (serverProcess && !serverProcess.killed) {
        try { serverProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }

        if (process.platform === 'win32') {
            setTimeout(() => {
                if (serverProcess && !serverProcess.killed) {
                    spawn('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
                }
            }, 3000);
        }
    }
}

process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    shutdown();
    process.exit(0);
});

console.log(`\n🖥️  Starting desktop dev mode (port ${port})...\n`);

serverProcess = spawn(npmCmd, ['start'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});

serverProcess.on('exit', (code) => {
    if (!shuttingDown && electronProcess && !electronProcess.killed) {
        try { electronProcess.kill('SIGTERM'); } catch (_) { /* ignore */ }
    }
    if (!shuttingDown) {
        process.exit(code || 0);
    }
});

waitForHealth()
    .then(() => {
        console.log(`\n✅ Server ready — launching Electron window...\n`);

        electronProcess = spawn(electronExe, [path.join(projectRoot, 'electron.js')], {
            cwd: projectRoot,
            env: { ...process.env, ELECTRON_DEV: '1' },
            stdio: 'inherit',
            windowsHide: false
        });

        electronProcess.on('exit', (code) => {
            console.log(`\nElectron closed — stopping server...\n`);
            shutdown();
            setTimeout(() => process.exit(code || 0), 500);
        });

        electronProcess.on('error', (error) => {
            console.error('Failed to launch Electron:', error.message);
            shutdown();
            process.exit(1);
        });
    })
    .catch((error) => {
        console.error('\n❌ Desktop startup failed:', error.message);
        console.error('   Make sure PostgreSQL is running and port', port, 'is free.\n');
        shutdown();
        process.exit(1);
    });
