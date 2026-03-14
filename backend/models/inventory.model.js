const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

function computeStatus(quantity, targetQuantity) {
    const q = Number(quantity) || 0;
    const t = Number(targetQuantity) || 0;
    if (t <= 0) return q > 0 ? 'available' : 'low';
    const ratio = q / t;
    if (ratio < 0.25) return 'critical';
    if (ratio < 0.5) return 'low';
    if (ratio >= 1) return 'surplus';
    return 'available';
}

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
        const { org_id, item_name, category, quantity, target_quantity, unit, expiry_date, notes } = data;
        const q = quantity || 0;
        const t = target_quantity != null ? target_quantity : null;
        const status = computeStatus(q, t);
        await promisePool.query(
            `INSERT INTO inventory_items (id, org_id, item_name, category, quantity, target_quantity, unit, status, expiry_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, org_id, item_name, category, q, t, unit || 'units', status, expiry_date || null, notes || null]
        );
        return this.findById(id);
    }

    static async update(id, orgId, data) {
        const allowed = ['item_name', 'category', 'quantity', 'target_quantity', 'unit', 'expiry_date', 'notes'];
        const fields = [];
        const values = [];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`\`${key}\` = ?`);
                values.push(data[key] === '' ? null : data[key]);
            }
        }
        if (!fields.length) return null;
        const item = await this.findById(id);
        if (!item || item.org_id !== orgId) return null;
        const q = data.quantity !== undefined ? data.quantity : item.quantity;
        const t = data.target_quantity !== undefined ? data.target_quantity : item.target_quantity;
        const status = computeStatus(q, t);
        fields.push('`status` = ?');
        values.push(status);
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

    // Items expiring within N days (for alerts)
    static async findExpiringSoon(days = 30, orgId = null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        let sql = `SELECT i.*, o.name AS org_name FROM inventory_items i
                   JOIN organizations o ON o.id = i.org_id
                   WHERE i.expiry_date IS NOT NULL AND i.expiry_date <= ? AND i.expiry_date >= CURDATE()`;
        const params = [cutoffStr];
        if (orgId) {
            sql += ' AND i.org_id = ?';
            params.push(orgId);
        }
        sql += ' ORDER BY i.expiry_date ASC';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }
}

module.exports = InventoryModel;
