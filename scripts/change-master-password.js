// Script to change master admin password securely
require('dotenv').config();
const bcrypt = require('bcrypt');
const readline = require('readline');
const { Pool } = require('pg');
const { MASTER_ADMIN_USERNAME } = require('../config/auth-config');

const masterPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'jewelry_master',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function changeMasterPassword() {
    try {
        console.log('\n🔐 Change Master Admin Password\n');
        console.log('⚠️  IMPORTANT: Choose a strong, unique password that:');
        console.log('   - Is at least 12 characters long');
        console.log('   - Contains uppercase, lowercase, numbers, and special characters');
        console.log('   - Has NOT been used anywhere else\n');

        const username = await question(`Enter master admin username [${MASTER_ADMIN_USERNAME}]: `);
        const finalUsername = username.trim() || MASTER_ADMIN_USERNAME;

        const checkResult = await masterPool.query(
            'SELECT * FROM admin_users WHERE username = $1',
            [finalUsername]
        );

        if (checkResult.rows.length === 0) {
            console.error(`❌ User "${finalUsername}" not found in admin_users table.`);
            process.exit(1);
        }

        const currentPassword = await question('Enter current password: ');
        const isValid = await bcrypt.compare(currentPassword, checkResult.rows[0].password_hash);
        if (!isValid) {
            console.error('❌ Current password is incorrect!');
            process.exit(1);
        }

        const newPassword = await question('Enter new password: ');
        if (newPassword.length < 6) {
            console.error('❌ Password must be at least 6 characters long!');
            process.exit(1);
        }

        const confirmPassword = await question('Confirm new password: ');
        if (newPassword !== confirmPassword) {
            console.error('❌ Passwords do not match!');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await masterPool.query(
            'UPDATE admin_users SET password_hash = $1, must_change_password = false WHERE username = $2',
            [hashedPassword, finalUsername]
        );

        console.log('\n✅ Password updated successfully!');
        console.log(`✅ User "${finalUsername}" can now login with the new password.\n');

        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error changing password:', error);
        rl.close();
        process.exit(1);
    }
}

changeMasterPassword();
