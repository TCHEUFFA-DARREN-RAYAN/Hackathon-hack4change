const { promisePool } = require('../config/database');

class StaffModel {
    static async findByEmailForLogin(email) {
        const [rows] = await promisePool.query(
            `SELECT s.*, o.name AS org_name
             FROM staff_members s
             JOIN organizations o ON o.id = s.org_id
             WHERE LOWER(s.email) = LOWER(?) LIMIT 1`,
            [email]
        );
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT s.id, s.org_id, s.first_name, s.last_name, s.email, s.status, o.name AS org_name
             FROM staff_members s
             JOIN organizations o ON o.id = s.org_id
             WHERE s.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    }
}

module.exports = StaffModel;
