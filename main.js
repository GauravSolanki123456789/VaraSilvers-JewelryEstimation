const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
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
let autoUpdaterInstance = null;

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
            preload: path.join(__dirname, 'preload.js'),
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

function configureAutoUpdaterAuth(autoUpdater) {
    bootstrapEnv();
    const token = process.env.GITHUB_UPDATE_TOKEN || process.env.GH_TOKEN;
    if (token) {
        process.env.GH_TOKEN = token;
        autoUpdater.requestHeaders = {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'VaraSilvers-Updater'
        };
        console.log('[Auto-updater] GitHub token configured for private repo.');
    } else {
        console.warn('[Auto-updater] GITHUB_UPDATE_TOKEN not set — private GitHub releases may not be detected.');
    }
}

function promptForUpdateDownload(info) {
    return dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version of Vara Silvers is available.',
        detail: `Current: ${app.getVersion()}\nNew: ${info.version}\n\nDownload and install now?`,
        buttons: ['Download and Install', 'Later'],
        defaultId: 0,
        cancelId: 1
    }).then(({ response }) => response === 0);
}

function promptForUpdateInstall() {
    return dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'The update has been downloaded.',
        detail: 'Restart now to install the new version?',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
    }).then(({ response }) => response === 0);
}

function setupAutoUpdater() {
    if (!app.isPackaged) return;

    try {
        configureAutoUpdaterAuth();
        const { autoUpdater } = require('electron-updater');
        autoUpdaterInstance = autoUpdater;

        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.logger = console;

        autoUpdater.on('update-available', (info) => {
            console.log('[Auto-updater] Update available:', info.version);
            promptForUpdateDownload(info).then((shouldDownload) => {
                if (shouldDownload) {
                    autoUpdater.downloadUpdate();
                }
            });
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('[Auto-updater] Already on latest version:', info?.version || app.getVersion());
        });

        autoUpdater.on('update-downloaded', () => {
            promptForUpdateInstall().then((shouldRestart) => {
                if (shouldRestart) {
                    isQuitting = true;
                    stopServerProcess();
                    autoUpdater.quitAndInstall(false, true);
                }
            });
        });

        autoUpdater.on('error', (error) => {
            const message = error?.message || String(error);
            if (message.includes('No published versions')) {
                console.log('[Auto-updater] No published GitHub release found yet.');
                return;
            }
            if (message.includes('404')) {
                console.error('[Auto-updater] Release not found (404). Ensure release is Published (not Draft) and GITHUB_UPDATE_TOKEN is set.');
                return;
            }
            console.error('[Auto-updater] Error:', message);
        });

        setTimeout(() => {
            autoUpdater.checkForUpdates().catch((error) => {
                console.error('[Auto-updater] Check failed:', error.message);
            });
        }, 4000);
    } catch (error) {
        console.error('[Auto-updater] Unavailable:', error.message);
    }
}

async function checkForUpdatesManually() {
    if (!app.isPackaged || !autoUpdaterInstance) {
        return { success: false, message: 'Auto-update only runs in the installed desktop app.' };
    }

    try {
        const result = await autoUpdaterInstance.checkForUpdates();
        const updateInfo = result?.updateInfo;
        const current = app.getVersion();
        const latest = updateInfo?.version;

        if (latest && latest !== current) {
            return { success: true, updateAvailable: true, currentVersion: current, latestVersion: latest };
        }
        return { success: true, updateAvailable: false, currentVersion: current, latestVersion: latest || current };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

function registerIpcHandlers() {
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:checkForUpdates', () => checkForUpdatesManually());
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
    registerIpcHandlers();

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
