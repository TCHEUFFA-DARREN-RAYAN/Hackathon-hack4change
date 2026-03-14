const { promisePool } = require('../config/database');

class ResourceModel {
    static async findAll(filters = {}) {
        let sql = 'SELECT r.*, o.name as org_name FROM resources r LEFT JOIN organizations o ON r.org_id = o.id WHERE 1=1';
        const params = [];
        if (filters.type) {
            sql += ' AND r.type = ?';
            params.push(filters.type);
        }
        if (filters.lat && filters.lng && filters.radius) {
            sql += ` AND (6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) <= ?`;
            params.push(filters.lat, filters.lng, filters.lat, filters.radius);
        }
        sql += ' ORDER BY r.name';
        const [rows] = await promisePool.query(sql, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            'SELECT r.*, o.name as org_name FROM resources r LEFT JOIN organizations o ON r.org_id = o.id WHERE r.id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async create(data) {
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        const { org_id, name, type, lat, lng, address, capacity, current_count, description, hours } = data;
        await promisePool.query(
            `INSERT INTO resources (id, org_id, name, type, lat, lng, address, capacity, current_count, description, hours)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [id, org_id || null, name, type, lat || null, lng || null, address || null, capacity || 0, current_count || 0, description || null, hours || null]
        );
        return this.findById(id);
    }

    static async update(id, updates) {
        const allowed = ['name', 'type', 'lat', 'lng', 'address', 'capacity', 'current_count', 'description', 'hours'];
        const set = [];
        const vals = [];
        for (const k of allowed) {
            if (updates[k] !== undefined) {
                set.push(`${k} = ?`);
                vals.push(updates[k]);
            }
        }
        if (set.length === 0) return this.findById(id);
        vals.push(id);
        await promisePool.query(`UPDATE resources SET ${set.join(', ')} WHERE id = ?`, vals);
        return this.findById(id);
    }
}

module.exports = ResourceModel;
