const path = require('path');
const fs = require('fs');

function stripEnvQuotes(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/^["']|["']$/g, '').trim();
}

function getBranding() {
    const companyName = stripEnvQuotes(process.env.COMPANY_NAME) || 'Jewellery Software';
    const appTagline = stripEnvQuotes(process.env.APP_TAGLINE) || 'Estimations & Inventory';
    const year = new Date().getFullYear();

    return {
        companyName,
        appTagline,
        appTitle: companyName,
        copyright: `© ${year} ${companyName}. All rights reserved.`
    };
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getBrandingScript() {
    return `<script>window.__BRANDING__=${JSON.stringify(getBranding())};</script>`;
}

function injectBranding(html) {
    const branding = getBranding();
    return html
        .replace(/\{\{BRANDING_SCRIPT\}\}/g, getBrandingScript())
        .replace(/\{\{COMPANY_NAME\}\}/g, escapeHtml(branding.companyName))
        .replace(/\{\{APP_TAGLINE\}\}/g, escapeHtml(branding.appTagline))
        .replace(/\{\{APP_TITLE\}\}/g, escapeHtml(branding.appTitle))
        .replace(/\{\{COPYRIGHT\}\}/g, escapeHtml(branding.copyright));
}

function serveBrandedHtml(res, filename) {
    const filePath = path.join(__dirname, '..', 'public', filename);
    const html = fs.readFileSync(filePath, 'utf8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.type('html').send(injectBranding(html));
}

module.exports = {
    getBranding,
    injectBranding,
    serveBrandedHtml
};
