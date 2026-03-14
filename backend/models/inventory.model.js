const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

class InventoryModel {
    static async findByOrg(orgId) {
        const [rows] = await promisePool.query(
            `SELECT * FROM inventory_items WHERE org_id = ? ORDER BY status ASC, item_name ASC`,
            [orgId]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT * FROM inventory_items WHERE id = ? LIMIT 1`, [id]
        );
        return rows[0] || null;
    }

    static async create(data) {
        const id = randomUUID();
        const { org_id, item_name, category, quantity, unit, status, expiry_date, notes } = data;
        await promisePool.query(
            `INSERT INTO inventory_items (id, org_id, item_name, category, quantity, unit, status, expiry_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, org_id, item_name, category, quantity || 0, unit || 'units', status || 'available', expiry_date || null, notes || null]
        );
        return this.findById(id);
    }

    static async update(id, orgId, data) {
        const allowed = ['item_name', 'category', 'quantity', 'unit', 'status', 'expiry_date', 'notes'];
        const fields = [];
        const values = [];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`\`${key}\` = ?`);
                values.push(data[key] === '' ? null : data[key]);
            }
        }
        if (!fields.length) return null;
        values.push(id, orgId);
        await promisePool.query(
            `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`,
            values
        );
        return this.findById(id);
    }

    static async delete(id, orgId) {
        const [result] = await promisePool.query(
            `DELETE FROM inventory_items WHERE id = ? AND org_id = ?`, [id, orgId]
        );
        return result.affectedRows > 0;
    }

    // All surplus items across network — for AI insights
    static async findAllSurplus() {
        const [rows] = await promisePool.query(
            `SELECT i.*, o.name AS org_name FROM inventory_items i
             JOIN organizations o ON o.id = i.org_id
             WHERE i.status = 'surplus'
             ORDER BY o.name, i.item_name`
        );
        return rows;
    }
}

module.exports = InventoryModel;
