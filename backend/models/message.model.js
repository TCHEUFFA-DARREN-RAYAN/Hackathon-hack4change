const { promisePool } = require('../config/database');

class MessageModel {
    static async findByUser(userId) {
        const [rows] = await promisePool.query(
            `SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
            [userId]
        );
        return rows;
    }

    static async create(data) {
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        const { user_id, sender_type, content } = data;
        await promisePool.query(
            'INSERT INTO messages (id, user_id, sender_type, content) VALUES (?,?,?,?)',
            [id, user_id, sender_type, content]
        );
        return this.findById(id);
    }

    static async findById(id) {
        const [rows] = await promisePool.query('SELECT * FROM messages WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async markRead(id) {
        await promisePool.query('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }
}

module.exports = MessageModel;
