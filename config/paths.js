const path = require('path');
const fs = require('fs');
const os = require('os');

function stripQuotes(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/^["']|["']$/g, '').trim();
}

function isElectronServer() {
    return process.env.ELECTRON_RUN_AS_NODE === '1' || !!process.versions.electron;
}

function getUserDataDir() {
    if (process.env.APP_USER_DATA) {
        return process.env.APP_USER_DATA;
    }

    if (process.env.PORTABLE_EXECUTABLE_DIR) {
        return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
    }

    const company = stripQuotes(process.env.COMPANY_NAME) || 'VaraSilvers';
    const safeName = company.replace(/[^a-zA-Z0-9-_]/g, '') || 'VaraSilvers';
    return path.join(os.homedir(), 'AppData', 'Local', safeName);
}

function getUploadsDir() {
    return path.join(getUserDataDir(), 'uploads', 'products');
}

function getBundledPublicDir() {
    return path.join(__dirname, '..', 'public');
}

function ensureWritableDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

function resolveProductImagePath(barcode, filename) {
    const writablePath = path.join(getUploadsDir(), filename || `${barcode}.jpg`);
    if (fs.existsSync(writablePath)) {
        return writablePath;
    }
    return path.join(getBundledPublicDir(), 'uploads', 'products', filename || `${barcode}.jpg`);
}

module.exports = {
    isElectronServer,
    getUserDataDir,
    getUploadsDir,
    getBundledPublicDir,
    ensureWritableDir,
    resolveProductImagePath
};
