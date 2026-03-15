const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

class ChatThreadModel {
    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT t.*, o.name AS org_name, po.name AS peer_org_name,
                    s.first_name AS staff_first_name, s.last_name AS staff_last_name, s.email AS staff_email
             FROM chat_threads t
             LEFT JOIN organizations o ON o.id = t.org_id
             LEFT JOIN organizations po ON po.id = t.peer_org_id
             LEFT JOIN staff_members s ON s.id = t.staff_id
             WHERE t.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }

    static async findOrCreateOrgChannel(orgId) {
        const [existing] = await promisePool.query(
            'SELECT * FROM chat_threads WHERE type = ? AND org_id = ? LIMIT 1',
            ['org_channel', orgId]
        );
        if (existing.length) return existing[0];
        const id = randomUUID();
        await promisePool.query(
            'INSERT INTO chat_threads (id, type, org_id) VALUES (?, ?, ?)',
            [id, 'org_channel', orgId]
        );
        return this.findById(id);
    }

    static async findOrCreateDirectThread(staffId) {
        const [existing] = await promisePool.query(
            'SELECT * FROM chat_threads WHERE type = ? AND staff_id = ? LIMIT 1',
            ['direct', staffId]
        );
        if (existing.length) return existing[0];
        const id = randomUUID();
        await promisePool.query(
            'INSERT INTO chat_threads (id, type, staff_id) VALUES (?, ?, ?)',
            [id, 'direct', staffId]
        );
        return this.findById(id);
    }

    static async findForCoordinator() {
        const [rows] = await promisePool.query(
            `SELECT t.*, o.name AS org_name, po.name AS peer_org_name,
                    s.first_name AS staff_first_name, s.last_name AS staff_last_name
             FROM chat_threads t
             LEFT JOIN organizations o ON o.id = t.org_id
             LEFT JOIN organizations po ON po.id = t.peer_org_id
             LEFT JOIN staff_members s ON s.id = t.staff_id
             ORDER BY t.type ASC, o.name ASC, s.last_name ASC`
        );
        return rows;
    }

    static async findOrCreateCrossOrgThread(orgId, peerOrgId) {
        const [existing] = await promisePool.query(
            `SELECT * FROM chat_threads WHERE type = 'cross_org'
             AND ((org_id = ? AND peer_org_id = ?) OR (org_id = ? AND peer_org_id = ?))
             LIMIT 1`,
            [orgId, peerOrgId, peerOrgId, orgId]
        );
        if (existing.length) return this.findById(existing[0].id);
        const id = randomUUID();
        // Use a direct INSERT with literal string to avoid any driver-side ENUM coercion issues
        await promisePool.query(
            "INSERT INTO chat_threads (id, type, org_id, peer_org_id) VALUES (?, 'cross_org', ?, ?)",
            [id, orgId, peerOrgId]
        );
        return this.findById(id);
    }

    static async findForStaff(orgId, staffId) {
        const [rows] = await promisePool.query(
            `SELECT t.*,
                    o.name AS org_name,
                    po.name AS peer_org_name,
                    s.first_name AS staff_first_name, s.last_name AS staff_last_name
             FROM chat_threads t
             LEFT JOIN organizations o ON o.id = t.org_id
             LEFT JOIN organizations po ON po.id = t.peer_org_id
             LEFT JOIN staff_members s ON s.id = t.staff_id
             WHERE (t.type = 'org_channel' AND t.org_id = ?)
                OR (t.type = 'direct' AND t.staff_id = ?)
                OR (t.type = 'cross_org' AND (t.org_id = ? OR t.peer_org_id = ?))
             ORDER BY t.type ASC, t.created_at DESC`,
            [orgId, staffId, orgId, orgId]
        );
        return rows;
    }
}

module.exports = ChatThreadModel;
