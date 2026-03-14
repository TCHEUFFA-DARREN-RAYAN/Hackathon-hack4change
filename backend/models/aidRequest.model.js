const { promisePool } = require('../config/database');

class AidRequestModel {
    static async findByUser(userId) {
        const [rows] = await promisePool.query(
            `SELECT ar.*, r.name as resource_name, r.type as resource_type
             FROM aid_requests ar LEFT JOIN resources r ON ar.resource_id = r.id
             WHERE ar.user_id = ? ORDER BY ar.created_at DESC`,
            [userId]
        );
        return rows;
    }

    static async findAll(filters = {}) {
        let sql = `SELECT ar.*, u.first_name, u.last_name, u.email, r.name as resource_name, r.type as resource_type
                   FROM aid_requests ar
                   JOIN users u ON ar.user_id = u.id
                   LEFT JOIN resources r ON ar.resource_id = r.id
                   WHERE 1=1`;
        const params = [];
        if (filters.status) {
            sql += ' AND ar.status = ?';
            params.push(filters.status);
        }
        sql += ' ORDER BY ar.created_at DESC';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    static async create(data) {
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        const { user_id, resource_id, type, notes } = data;
        await promisePool.query(
            'INSERT INTO aid_requests (id, user_id, resource_id, type, notes) VALUES (?,?,?,?,?)',
            [id, user_id, resource_id || null, type, notes || null]
        );
        return this.findById(id);
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT ar.*, u.first_name, u.last_name, u.email, r.name as resource_name
             FROM aid_requests ar JOIN users u ON ar.user_id = u.id
             LEFT JOIN resources r ON ar.resource_id = r.id
             WHERE ar.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async updateStatus(id, status) {
        await promisePool.query('UPDATE aid_requests SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }
}

module.exports = AidRequestModel;
