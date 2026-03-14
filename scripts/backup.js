/**
 * CommonGround Database Backup
 * Exports all data to JSON for portability and disaster recovery.
 * Run: npm run backup
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TABLES = [
    'admins',
    'organizations',
    'staff_members',
    'inventory_items',
    'needs',
    'donations',
    'chat_threads',
    'chat_messages',
    'surplus_requests',
    'surplus_transfers',
];

const run = async () => {
    let conn;
    try {
        const connConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        };
        if (process.env.DB_SSL_ENABLED === 'true' || process.env.DB_SSL_ENABLED === '1') {
            let ca = process.env.DB_CA_CERT;
            if (!ca && process.env.DB_CA_CERT_PATH) {
                const certPath = path.resolve(process.cwd(), process.env.DB_CA_CERT_PATH);
                ca = fs.readFileSync(certPath, 'utf8');
            }
            connConfig.ssl = ca
                ? { ca, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
                : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
        }
        conn = await mysql.createConnection(connConfig);

        const backup = {
            metadata: {
                app: 'CommonGround',
                timestamp: new Date().toISOString(),
                database: process.env.DB_NAME,
            },
            tables: {},
        };

        for (const table of TABLES) {
            const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
            backup.tables[table] = rows;
            console.log(`  ${table}: ${rows.length} rows`);
        }

        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filePath = path.join(backupDir, `backup-${dateStr}.json`);

        fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
        console.log(`\nBackup saved: ${filePath}`);

    } catch (err) {
        console.error('Backup failed:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();
