/**
 * Add target_quantity column to inventory_items for existing databases.
 * Run: node scripts/add-target-quantity.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        });
        const [cols] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inventory_items'`,
            [process.env.DB_NAME]
        );
        if (cols.some(c => c.COLUMN_NAME === 'target_quantity')) {
            console.log('target_quantity column already exists.');
            return;
        }
        await conn.query(`ALTER TABLE inventory_items ADD COLUMN target_quantity INT NULL DEFAULT NULL AFTER quantity`);
        console.log('Added target_quantity column to inventory_items.');
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}
run();
