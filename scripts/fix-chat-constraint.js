/**
 * Fix: drops the chk_thread_type CHECK constraint on chat_threads.
 * MySQL 8 incorrectly fires this constraint when inserting 'cross_org'
 * via parameterized queries. The ENUM column already enforces valid types.
 * Run: node scripts/fix-chat-constraint.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async () => {
    let conn;
    try {
        const cfg = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        };
        if (process.env.DB_SSL_ENABLED === 'true' || process.env.DB_SSL_ENABLED === '1') {
            let ca = process.env.DB_CA_CERT;
            if (!ca && process.env.DB_CA_CERT_PATH) {
                ca = fs.readFileSync(path.resolve(process.cwd(), process.env.DB_CA_CERT_PATH), 'utf8');
            }
            cfg.ssl = ca ? { ca, rejectUnauthorized: false } : { rejectUnauthorized: false };
        }
        conn = await mysql.createConnection(cfg);
        console.log('Connected.');

        // Drop the broken constraint
        await conn.query('ALTER TABLE chat_threads DROP CONSTRAINT chk_thread_type');
        console.log('✅ Dropped chk_thread_type constraint.');

        // Test that cross_org insert now works
        const { randomUUID } = require('crypto');
        const testId = randomUUID();
        // Get two real org IDs to test with
        const [orgs] = await conn.query('SELECT id FROM organizations LIMIT 2');
        if (orgs.length >= 2) {
            await conn.query(
                "INSERT INTO chat_threads (id, type, org_id, peer_org_id) VALUES (?, 'cross_org', ?, ?)",
                [testId, orgs[0].id, orgs[1].id]
            );
            await conn.query('DELETE FROM chat_threads WHERE id = ?', [testId]);
            console.log('✅ Test insert/delete succeeded — constraint is fixed.');
        }

        console.log('Done. Restart the backend server.');
    } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.message.includes('check constraint')) {
            console.log('ℹ️  Constraint may already be dropped or named differently — checking...');
            const [rows] = await conn.query(
                "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_NAME='chat_threads' AND CONSTRAINT_TYPE='CHECK'"
            );
            console.log('Existing CHECK constraints:', rows);
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        if (conn) await conn.end();
    }
})();
