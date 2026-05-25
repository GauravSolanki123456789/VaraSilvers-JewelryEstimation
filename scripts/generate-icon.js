const fs = require('fs');
const path = require('path');

async function generateIcon() {
    const buildDir = path.join(__dirname, '..', 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    const outPath = path.join(buildDir, 'icon.png');

    try {
        const sharp = require('sharp');
        const size = 256;
        const svg = `
            <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#f59e0b"/>
                        <stop offset="100%" style="stop-color:#ea580c"/>
                    </linearGradient>
                </defs>
                <rect width="${size}" height="${size}" rx="48" fill="url(#g)"/>
                <text x="50%" y="54%" text-anchor="middle" fill="#ffffff"
                    font-family="Arial, sans-serif" font-size="96" font-weight="700">VS</text>
            </svg>`;

        await sharp(Buffer.from(svg)).png().toFile(outPath);
        console.log('Created', outPath);
    } catch (error) {
        console.warn('Could not generate icon with sharp, creating minimal placeholder:', error.message);
        const minimalSvg = path.join(buildDir, 'icon.svg');
        fs.writeFileSync(minimalSvg, `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="48" fill="#f59e0b"/><text x="128" y="150" text-anchor="middle" fill="#fff" font-size="96" font-family="Arial" font-weight="700">VS</text></svg>`);
        console.log('Created', minimalSvg);
    }
}

generateIcon();
