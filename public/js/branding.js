(function () {
    'use strict';

    function getBranding() {
        return window.__BRANDING__ || {};
    }

    window.getBrandName = function () {
        const branding = getBranding();
        if (branding.companyName) return branding.companyName;
        if (typeof invoiceSettings !== 'undefined' && invoiceSettings.companyName) {
            return invoiceSettings.companyName;
        }
        return 'COMPANY';
    };

    window.applyBranding = function () {
        const branding = getBranding();
        if (!branding.companyName) return;

        document.querySelectorAll('[data-brand]').forEach(function (el) {
            const key = el.getAttribute('data-brand');
            if (branding[key]) {
                el.textContent = branding[key];
            }
        });

        document.querySelectorAll('[data-brand-title]').forEach(function (el) {
            const suffix = el.getAttribute('data-brand-title');
            document.title = suffix
                ? suffix + ' - ' + branding.companyName
                : branding.companyName;
        });

        var initialsEl = document.getElementById('brandInitials');
        if (initialsEl) {
            var words = branding.companyName.trim().split(/\s+/);
            var initials = words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
            initialsEl.textContent = initials || branding.companyName.charAt(0).toUpperCase();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.applyBranding);
    } else {
        window.applyBranding();
    }
})();
