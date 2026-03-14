const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

class DonationModel {
    static async findAll(filters = {}) {
        let sql = `SELECT d.*,
                    po.name AS preferred_org_name,
                    mo.name AS matched_org_name,
                    mo.contact_email AS matched_org_email,
                    mo.contact_phone AS matched_org_phone
                   FROM donations d
                   LEFT JOIN organizations po ON po.id = d.preferred_org_id
                   LEFT JOIN organizations mo ON mo.id = d.matched_org_id
                   WHERE 1=1`;
        const params = [];
        if (filters.status) { sql += ' AND d.status = ?'; params.push(filters.status); }
        if (filters.orgId) { sql += ' AND (d.matched_org_id = ? OR d.preferred_org_id = ?)'; params.push(filters.orgId, filters.orgId); }
        sql += ' ORDER BY d.created_at DESC';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT d.*,
                po.name AS preferred_org_name,
                mo.name AS matched_org_name,
                mo.contact_email AS matched_org_email,
                mo.contact_phone AS matched_org_phone,
                mo.address AS matched_org_address
             FROM donations d
             LEFT JOIN organizations po ON po.id = d.preferred_org_id
             LEFT JOIN organizations mo ON mo.id = d.matched_org_id
             WHERE d.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    // Donations matched to a specific org (for staff portal incoming)
    static async findByMatchedOrg(orgId) {
        const [rows] = await promisePool.query(
            `SELECT * FROM donations
             WHERE matched_org_id = ? AND status IN ('matched', 'confirmed')
             ORDER BY created_at DESC`,
            [orgId]
        );
        return rows;
    }

    static async create(data) {
        const id = randomUUID();
        const { donor_name, donor_email, donor_phone, item_name, category, quantity, unit, condition, preferred_org_id } = data;
        await promisePool.query(
            `INSERT INTO donations (id, donor_name, donor_email, donor_phone, item_name, category, quantity, unit, \`condition\`, preferred_org_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [id, donor_name, donor_email, donor_phone || null, item_name, category, quantity || 1, unit || 'units', condition || 'good', preferred_org_id || null]
        );
        return this.findById(id);
    }

    static async applyMatch(id, orgId, reasoning) {
        await promisePool.query(
            `UPDATE donations SET matched_org_id = ?, ai_match_reasoning = ?, status = 'matched' WHERE id = ?`,
            [orgId, reasoning, id]
        );
        return this.findById(id);
    }

    static async updateStatus(id, status) {
        const allowed = ['pending', 'matched', 'confirmed', 'delivered'];
        if (!allowed.includes(status)) return null;
        await promisePool.query(`UPDATE donations SET status = ? WHERE id = ?`, [status, id]);
        return this.findById(id);
    }

    // Pipeline summary for coordinator
    static async getPipelineCounts() {
        const [rows] = await promisePool.query(
            `SELECT status, COUNT(*) AS count FROM donations GROUP BY status`
        );
        const result = { pending: 0, matched: 0, confirmed: 0, delivered: 0 };
        for (const r of rows) result[r.status] = r.count;
        return result;
    }

    // Recent donations for coordinator dashboard
    static async findRecent(limit = 20) {
        const [rows] = await promisePool.query(
            `SELECT d.*, mo.name AS matched_org_name
             FROM donations d
             LEFT JOIN organizations mo ON mo.id = d.matched_org_id
             ORDER BY d.created_at DESC LIMIT ?`,
            [limit]
        );
        return rows;
    }
}

module.exports = DonationModel;
