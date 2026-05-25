const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function stripEnvQuotes(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/^["']|["']$/g, '').trim();
}

function getEnvCandidates(installDir, userDataDir, resourcesPath, isPackaged) {
    if (!isPackaged) {
        return [path.join(__dirname, '..', '.env')];
    }
    const roaming = process.env.APPDATA || '';
    return [
        path.join(userDataDir, '.env'),
        path.join(installDir, '.env'),
        path.join(roaming, 'Vara Silvers', '.env'),
        path.join(roaming, 'jewelry-estimation', '.env')
    ];
}

function ensureConfigEnv(options = {}) {
    const {
        installDir = __dirname,
        userDataDir = installDir,
        resourcesPath = process.resourcesPath,
        isPackaged = false,
        sourceEnvPath = null
    } = options;

    const userEnvPath = path.join(userDataDir, '.env');

    if (!isPackaged) {
        const devEnv = path.join(__dirname, '..', '.env');
        dotenv.config({ path: fs.existsSync(devEnv) ? devEnv : undefined });
        return devEnv;
    }

    // Packaged: always prefer writable AppData location (survives reinstalls, no admin needed)
    if (!fs.existsSync(userEnvPath)) {
        const installEnv = path.join(installDir, '.env');
        const legacyEnv = path.join(process.env.APPDATA || '', 'jewelry-estimation', '.env');
        const seed = sourceEnvPath && fs.existsSync(sourceEnvPath)
            ? sourceEnvPath
            : fs.existsSync(installEnv)
                ? installEnv
                : fs.existsSync(legacyEnv)
                    ? legacyEnv
                    : null;

        if (seed) {
            try {
                fs.mkdirSync(userDataDir, { recursive: true });
                fs.copyFileSync(seed, userEnvPath);
                console.log('[Config] Created .env at:', userEnvPath);
            } catch (error) {
                console.warn('[Config] Could not create .env in AppData:', error.message);
            }
        }
    }

    if (fs.existsSync(userEnvPath)) {
        dotenv.config({ path: userEnvPath, override: true });
        return userEnvPath;
    }

    const fallback = getEnvCandidates(installDir, userDataDir, resourcesPath, isPackaged)
        .find((p) => fs.existsSync(p));

    if (fallback) {
        dotenv.config({ path: fallback, override: true });
        return fallback;
    }

    return userEnvPath;
}

function loadElectronEnv(options = {}) {
    return ensureConfigEnv(options);
}

function getPort() {
    return parseInt(process.env.PORT, 10) || 3001;
}

function getCompanyName() {
    return stripEnvQuotes(process.env.COMPANY_NAME) || 'Jewellery Software';
}

function getServerUrl(port = getPort()) {
    return `http://localhost:${port}`;
}

function hasRequiredEnv() {
    return Boolean(
        process.env.DATABASE_URL &&
        String(process.env.DATABASE_URL).trim() &&
        process.env.SESSION_SECRET &&
        String(process.env.SESSION_SECRET).trim()
    );
}

module.exports = {
    loadElectronEnv,
    ensureConfigEnv,
    getPort,
    getCompanyName,
    getServerUrl,
    hasRequiredEnv,
    stripEnvQuotes
};
