/**
 * Copy project .env to the installed app's AppData folder (run once per machine).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, '.env');

if (!fs.existsSync(source)) {
    console.error('No .env in project root. Create one first.');
    process.exit(1);
}

const roaming = process.env.APPDATA;
if (!roaming) {
    console.error('APPDATA not set — run on Windows.');
    process.exit(1);
}

const targets = [
    path.join(roaming, 'Vara Silvers', '.env'),
    path.join(roaming, 'jewelry-estimation', '.env')
];

for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    console.log('Copied .env to', target);
}

console.log('\nDone. Launch Vara Silvers from the desktop shortcut.');
