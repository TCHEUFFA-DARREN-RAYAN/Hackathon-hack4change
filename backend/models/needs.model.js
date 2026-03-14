const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

class NeedsModel {
    static async findAll(filters = {}) {
        let sql = `SELECT n.*, o.name AS org_name, o.category AS org_category
                   FROM needs n
                   JOIN organizations o ON o.id = n.org_id
                   WHERE n.fulfilled = 0`;
        const params = [];

        if (filters.urgency) { sql += ' AND n.urgency = ?'; params.push(filters.urgency); }
        if (filters.category) { sql += ' AND n.category = ?'; params.push(filters.category); }
        if (filters.orgCategory) { sql += ' AND o.category = ?'; params.push(filters.orgCategory); }
        if (filters.search) {
            sql += ' AND (n.item_name LIKE ? OR o.name LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        sql += ` ORDER BY
            CASE n.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
            n.created_at ASC`;

        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    static async findByOrg(orgId) {
        const [rows] = await promisePool.query(
            `SELECT * FROM needs WHERE org_id = ? ORDER BY fulfilled ASC,
             CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
             created_at ASC`,
            [orgId]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT n.*, o.name AS org_name FROM needs n
             JOIN organizations o ON o.id = n.org_id
             WHERE n.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    static async create(data) {
        const id = randomUUID();
        const { org_id, item_name, category, quantity_needed, unit, urgency, notes } = data;
        await promisePool.query(
            `INSERT INTO needs (id, org_id, item_name, category, quantity_needed, unit, urgency, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, org_id, item_name, category, quantity_needed || 1, unit || 'units', urgency || 'medium', notes || null]
        );
        return this.findById(id);
    }

    static async update(id, orgId, data) {
        const allowed = ['item_name', 'category', 'quantity_needed', 'unit', 'urgency', 'notes'];
        const fields = [];
        const values = [];
        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`\`${key}\` = ?`);
                values.push(data[key]);
            }
        }
        if (!fields.length) return null;
        values.push(id, orgId);
        await promisePool.query(
            `UPDATE needs SET ${fields.join(', ')} WHERE id = ? AND org_id = ?`, values
        );
        return this.findById(id);
    }

    static async markFulfilled(id, orgId) {
        await promisePool.query(
            `UPDATE needs SET fulfilled = 1, fulfilled_at = NOW() WHERE id = ? AND org_id = ?`,
            [id, orgId]
        );
        return this.findById(id);
    }

    static async delete(id, orgId) {
        const [result] = await promisePool.query(
            `DELETE FROM needs WHERE id = ? AND org_id = ?`, [id, orgId]
        );
        return result.affectedRows > 0;
    }

    // For AI matching: all unfulfilled needs with org info
    static async findAllUnfulfilled() {
        const [rows] = await promisePool.query(
            `SELECT n.*, o.name AS org_name, o.category AS org_category, o.address AS org_address,
                    o.contact_email AS org_email
             FROM needs n
             JOIN organizations o ON o.id = n.org_id
             WHERE n.fulfilled = 0
             ORDER BY CASE n.urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`
        );
        return rows;
    }
}

module.exports = NeedsModel;
