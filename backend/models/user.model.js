const { promisePool } = require('../config/database');

class UserModel {
    static async findByEmail(email) {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            'SELECT id, first_name, last_name, email, phone, user_type, display_name, anonymity, status, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async create(data) {
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        const { first_name, last_name, email, phone, password_hash, user_type } = data;
        await promisePool.query(
            'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, user_type) VALUES (?,?,?,?,?,?,?)',
            [id, first_name, last_name, email.toLowerCase(), phone || null, password_hash, user_type || 'homeless']
        );
        return this.findById(id);
    }

    static async update(id, updates) {
        const allowed = ['first_name', 'last_name', 'phone', 'display_name', 'anonymity', 'user_type'];
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
        await promisePool.query(`UPDATE users SET ${set.join(', ')} WHERE id = ?`, vals);
        return this.findById(id);
    }
}

module.exports = UserModel;
