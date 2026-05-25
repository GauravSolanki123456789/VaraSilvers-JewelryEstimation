/**
 * Shared auth configuration — used by server, passport, and health endpoints.
 */

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'jaigaurav56789@gmail.com').toLowerCase().trim();
const MASTER_ADMIN_USERNAME = (process.env.MASTER_ADMIN_USERNAME || 'Gaurav').trim();
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

function isGoogleOAuthEnabled() {
    const clientId = process.env.GOOGLE_CLIENT_ID && String(process.env.GOOGLE_CLIENT_ID).trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET && String(process.env.GOOGLE_CLIENT_SECRET).trim();
    return Boolean(clientId && clientSecret);
}

function getSessionCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isElectronDesktop = Boolean(process.env.APP_USER_DATA || process.env.ELECTRON_RUN_AS_NODE);
    const clientUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3001}`;
    const secure = isProduction && !isElectronDesktop && clientUrl.startsWith('https');

    return {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure
    };
}

module.exports = {
    SUPER_ADMIN_EMAIL,
    MASTER_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD,
    isGoogleOAuthEnabled,
    getSessionCookieOptions
};
