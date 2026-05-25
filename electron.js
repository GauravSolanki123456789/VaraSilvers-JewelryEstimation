/**
 * Electron dev entry — used by `npm run desktop`.
 * Production packaged apps use main.js directly via electron-builder.
 */
process.env.ELECTRON_DEV = process.env.ELECTRON_DEV || '1';
require('./main.js');
