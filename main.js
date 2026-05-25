const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// Must match productName so AppData path is consistent (%APPDATA%\Vara Silvers)
app.setName('Vara Silvers');
const {
    loadElectronEnv,
    getPort,
    getCompanyName,
    getServerUrl,
    hasRequiredEnv,
    ensureConfigEnv
} = require('./electron-env');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

const isDevMode = process.env.ELECTRON_DEV === '1';
const shouldSpawnServer = app.isPackaged || process.env.ELECTRON_START_SERVER === '1';

if (isDevMode) {
    console.log('[Electron] Dev mode — connecting to external server');
}

function getAppRoot() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app.asar');
    }
    return __dirname;
}

function getUnpackedRoot() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked');
    }
    return __dirname;
}

function getInstallDir() {
    return path.dirname(process.execPath);
}

function getUserDataDir() {
    if (app.isPackaged) {
        return app.getPath('userData');
    }
    return __dirname;
}

function bootstrapEnv() {
    return ensureConfigEnv({
        installDir: getInstallDir(),
        userDataDir: getUserDataDir(),
        resourcesPath: process.resourcesPath,
        isPackaged: app.isPackaged
    });
}

function getServerEnvPath() {
    return bootstrapEnv() || path.join(getUserDataDir(), '.env');
}

function waitForServer(serverUrl, maxAttempts = 90) {
    const healthUrl = `${serverUrl}/api/health`;

    return new Promise((resolve) => {
        let attempts = 0;

        const check = () => {
            attempts += 1;
            const request = http.get(healthUrl, (response) => {
                response.resume();
                if (response.statusCode === 200) {
                    resolve(true);
                    return;
                }
                retry();
            });

            request.on('error', retry);
            request.setTimeout(2000, () => {
                request.destroy();
                retry();
            });
        };

        const retry = () => {
            if (attempts >= maxAttempts) {
                resolve(false);
                return;
            }
            setTimeout(check, 1000);
        };

        check();
    });
}

let serverLogBuffer = '';

function startServerProcess() {
    const serverRoot = getAppRoot();
    const serverPath = path.join(serverRoot, 'server.js');
    const installDir = getInstallDir();
    const envPath = getServerEnvPath();

    if (!app.isPackaged && !fs.existsSync(serverPath)) {
        throw new Error(`Server entry not found: ${serverPath}`);
    }

    serverLogBuffer = '';

    serverProcess = spawn(process.execPath, [serverPath], {
        cwd: installDir,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            APP_USER_DATA: getUserDataDir(),
            ELECTRON_INSTALL_DIR: installDir,
            DOTENV_CONFIG_PATH: envPath
        },
        stdio: app.isPackaged ? 'pipe' : 'inherit',
        windowsHide: true
    });

    if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (chunk) => {
            const text = chunk.toString();
            serverLogBuffer += text;
            process.stdout.write(chunk);
        });
    }
    if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (chunk) => {
            const text = chunk.toString();
            serverLogBuffer += text;
            process.stderr.write(chunk);
        });
    }

    serverProcess.on('exit', (code, signal) => {
        if (!isQuitting && code && code !== 0) {
            const logTail = serverLogBuffer.trim().slice(-1500);
            const portBusy = logTail.includes('EADDRINUSE') || logTail.includes('already in use');
            dialog.showErrorBox(
                'Server Stopped',
                portBusy
                    ? `Port ${getPort()} is already in use.\n\nClose all other Vara Silvers windows and run:\ntaskkill /F /IM node.exe\ntaskkill /F /IM "Vara Silvers.exe"\n\nThen open the app again.`
                    : `The application server exited unexpectedly (code ${code}${signal ? `, ${signal}` : ''}).\n\n` +
                      (logTail ? `Details:\n${logTail}` : 'Ensure PostgreSQL is running and .env is next to the app.')
            );
            app.quit();
        }
    });
}

function stopServerProcess() {
    if (!serverProcess || serverProcess.killed) return;

    const pid = serverProcess.pid;
    serverProcess.kill('SIGTERM');

    setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
            try {
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
                } else {
                    serverProcess.kill('SIGKILL');
                }
            } catch (_) {
                // ignore
            }
        }
    }, 5000);
}

function createMainWindow(serverUrl) {
    const companyName = getCompanyName();

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        title: companyName,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#111827',
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Fallback: show window even if ready-to-show is delayed
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
            mainWindow.focus();
        }
    }, 3000);

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error('[Electron] Page load failed:', errorCode, errorDescription);
        dialog.showErrorBox(
            'Load Error',
            `Could not load ${serverUrl}\n\n${errorDescription} (${errorCode})`
        );
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.loadURL(serverUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function setupAutoUpdater() {
    if (!app.isPackaged) return;

    try {
        const { autoUpdater } = require('electron-updater');

        autoUpdater.autoDownload = false;
        autoUpdater.logger = console;

        autoUpdater.on('update-available', (info) => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: 'An update is available. Download and install?',
                detail: `Version ${info.version} is ready to download.`,
                buttons: ['Download and Install', 'Later'],
                defaultId: 0,
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
        });

        autoUpdater.on('update-downloaded', () => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'The update has been downloaded. Restart now to install?',
                buttons: ['Restart Now', 'Later'],
                defaultId: 0,
                cancelId: 1
            }).then(({ response }) => {
                if (response === 0) {
                    isQuitting = true;
                    stopServerProcess();
                    autoUpdater.quitAndInstall(false, true);
                }
            });
        });

        autoUpdater.on('error', (error) => {
            if (error.message && error.message.includes('No published versions')) {
                console.log('Auto-updater: no releases published yet (this is normal before first publish).');
                return;
            }
            console.error('Auto-updater error:', error.message);
        });

        autoUpdater.checkForUpdates().catch((error) => {
            if (error.message && error.message.includes('No published versions')) {
                console.log('Auto-updater: no releases published yet (this is normal before first publish).');
                return;
            }
            console.error('Update check failed:', error.message);
        });
    } catch (error) {
        console.error('Auto-updater unavailable:', error.message);
    }
}

async function launchApplication() {
    const envPath = bootstrapEnv();

    if (app.isPackaged && !hasRequiredEnv()) {
        const installEnv = path.join(getInstallDir(), '.env');
        dialog.showErrorBox(
            'Missing Configuration',
            `The app needs a .env file with DATABASE_URL and SESSION_SECRET.\n\n` +
            `Copy your configured .env to ONE of these paths, then restart:\n\n` +
            `1) (Recommended) ${envPath}\n` +
            `2) Next to the app exe: ${installEnv}\n\n` +
            `PowerShell (replace source path if needed):\n` +
            `Copy-Item "D:\\GauravSoftwares_Clients\\VaraSilvers\\.env" "${envPath}" -Force`
        );
        app.quit();
        return;
    }

    const port = getPort();
    const serverUrl = getServerUrl(port);

    if (shouldSpawnServer && !isDevMode) {
        startServerProcess();
    }

    const ready = await waitForServer(serverUrl);
    if (!ready) {
        const logTail = serverLogBuffer.trim().slice(-1500);
        dialog.showErrorBox(
            'Startup Failed',
            `Could not connect to the application server at ${serverUrl}.\n\n` +
            'Please ensure PostgreSQL is running and your .env file is next to the installed app.\n\n' +
            (logTail ? `Server log:\n${logTail}` : '')
        );
        stopServerProcess();
        app.quit();
        return;
    }

    console.log('[Electron] Server ready — opening window:', serverUrl);
    createMainWindow(serverUrl);
    setupAutoUpdater();
}

function initApp() {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(launchApplication);

    app.on('window-all-closed', () => {
        isQuitting = true;
        stopServerProcess();
        app.quit();
    });

    app.on('before-quit', () => {
        isQuitting = true;
        stopServerProcess();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            launchApplication();
        }
    });
}

// Skip single-instance lock in dev (prevents instant exit on re-launch)
if (isDevMode) {
    initApp();
} else if (app.requestSingleInstanceLock()) {
    initApp();
} else {
    app.quit();
}
