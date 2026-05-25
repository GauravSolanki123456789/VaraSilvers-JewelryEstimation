/**
 * After `npm run dist`, copy the project .env next to the unpacked exe
 * so local testing works without a manual Copy-Item step.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, '.env');

if (!fs.existsSync(source)) {
    console.warn('[copy-env] No .env in project root — skip (create one from .env.example)');
    process.exit(0);
}

const targets = [
    path.join(root, 'dist', 'win-unpacked', '.env'),
    path.join(root, 'release', 'win-unpacked', '.env'),
    path.join(root, 'build-out', 'win-unpacked', '.env')
];

let copied = 0;
for (const target of targets) {
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) continue;
    fs.copyFileSync(source, target);
    console.log('[copy-env] Copied .env to', target);
    copied++;
}

if (copied === 0) {
    console.warn('[copy-env] No win-unpacked folder found — run npm run dist first');
}
