const { promisePool } = require('../config/database');

class AdminModel {
    static async findByEmail(email) {
        const [rows] = await promisePool.query(
            'SELECT * FROM admins WHERE LOWER(email) = LOWER(?) AND status = ? LIMIT 1',
            [email, 'active']
        );
        return rows[0] || null;
    }

    static async findByEmailForLogin(email) {
        const [rows] = await promisePool.query('SELECT * FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            'SELECT id, first_name, last_name, email, status, created_at FROM admins WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }
}

module.exports = AdminModel;
