/**
 * Loads .env for server-side modules (database, passport, etc.).
 * Honors DOTENV_CONFIG_PATH set by Electron main process.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function getEnvCandidates() {
    const candidates = [];

    if (process.env.DOTENV_CONFIG_PATH) {
        candidates.push(process.env.DOTENV_CONFIG_PATH);
    }

    if (process.env.APP_USER_DATA) {
        candidates.push(path.join(process.env.APP_USER_DATA, '.env'));
    }

    const roaming = process.env.APPDATA;
    if (roaming) {
        candidates.push(path.join(roaming, 'Vara Silvers', '.env'));
        candidates.push(path.join(roaming, 'jewelry-estimation', '.env'));
    }

    const installDir = process.env.ELECTRON_INSTALL_DIR;
    if (installDir) {
        candidates.push(path.join(installDir, '.env'));
    }

    candidates.push(path.join(__dirname, '..', '.env'));

    return [...new Set(candidates.filter(Boolean))];
}

function loadEnv() {
    for (const envPath of getEnvCandidates()) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath, override: true });
            return envPath;
        }
    }

    dotenv.config();
    return null;
}

const loadedFrom = loadEnv();

module.exports = {
    loadEnv,
    loadedFrom,
    getEnvCandidates
};
