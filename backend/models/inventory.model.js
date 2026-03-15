const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

function computeStatus(quantity, threshold) {
    const q = Number(quantity) || 0;
    const t = Number(threshold) || 0;
    if (t <= 0) return q > 0 ? 'available' : 'low';
    if (q < t) return 'low';
    if (q > t) return 'surplus';
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

    static async findByOrgAndItem(orgId, itemName, category) {
        const [rows] = await promisePool.query(
            `SELECT * FROM inventory_items WHERE org_id = ? AND LOWER(item_name) = LOWER(?) AND LOWER(category) = LOWER(?) LIMIT 1`,
            [orgId, itemName, category]
        );
        return rows[0] || null;
    }

    static async addQuantityForNeed(orgId, itemName, category, unit, amount) {
        const existing = await this.findByOrgAndItem(orgId, itemName, category);
        if (existing) {
            const newQty = (Number(existing.quantity) || 0) + amount;
            await promisePool.query(
                `UPDATE inventory_items SET quantity = ?, status = ? WHERE id = ? AND org_id = ?`,
                [newQty, computeStatus(newQty, existing.target_quantity ?? 0), existing.id, orgId]
            );
            return this.findById(existing.id);
        }
        return this.create({
            org_id: orgId,
            item_name: itemName,
            category: category,
            quantity: amount,
            target_quantity: 0,
            unit: unit || 'items',
            expiry_date: null,
            notes: null
        });
    }

    static async create(data) {
        const { org_id, item_name, category, quantity, target_quantity, unit, expiry_date, notes } = data;
        const existing = await this.findByOrgAndItem(org_id, item_name, category);
        if (existing) {
            const err = new Error(`An inventory item "${item_name}" in category "${category}" already exists. Use a different category or unit to add a separate entry.`);
            err.code = 'DUPLICATE_INVENTORY';
            throw err;
        }
        const id = randomUUID();
        const q = quantity || 0;
        const t = target_quantity != null ? target_quantity : 0;
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
        const t = data.target_quantity !== undefined ? data.target_quantity : (item.target_quantity ?? 0);
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
