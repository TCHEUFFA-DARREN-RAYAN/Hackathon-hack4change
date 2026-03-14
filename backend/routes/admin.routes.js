const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { promisePool } = require('../config/database');
const ResourceModel = require('../models/resource.model');
const AidRequestModel = require('../models/aidRequest.model');
const MessageModel = require('../models/message.model');
const UserModel = require('../models/user.model');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        const [[{ users }]] = await promisePool.query('SELECT COUNT(*) as users FROM users');
        const [[{ resources }]] = await promisePool.query('SELECT COUNT(*) as resources FROM resources');
        const [[{ pending }]] = await promisePool.query("SELECT COUNT(*) as pending FROM aid_requests WHERE status = 'pending'");
        const [[{ messages }]] = await promisePool.query('SELECT COUNT(*) as messages FROM messages');
        const [recentRequests] = await promisePool.query(
            `SELECT ar.id, ar.type, ar.status, ar.created_at, u.first_name, u.last_name
             FROM aid_requests ar JOIN users u ON ar.user_id = u.id
             ORDER BY ar.created_at DESC LIMIT 5`
        );
        res.json({
            success: true,
            data: {
                stats: { users, resources, pending, messages },
                recentRequests
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get('/users', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT id, first_name, last_name, email, user_type, status, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/resources', async (req, res) => {
    try {
        const list = await ResourceModel.findAll({});
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/resources', async (req, res) => {
    try {
        const r = await ResourceModel.create(req.body);
        res.status(201).json({ success: true, data: r });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.patch('/resources/:id', async (req, res) => {
    try {
        const r = await ResourceModel.update(req.params.id, req.body);
        res.json({ success: true, data: r });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/requests', async (req, res) => {
    try {
        const list = await AidRequestModel.findAll({ status: req.query.status || undefined });
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.patch('/requests/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'reviewing', 'fulfilled', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false });
        }
        const r = await AidRequestModel.updateStatus(req.params.id, status);
        res.json({ success: true, data: r });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT m.*, u.first_name, u.last_name, u.email FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC LIMIT 100'
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/messages', async (req, res) => {
    try {
        const { user_id, content } = req.body;
        if (!user_id || !content?.trim()) return res.status(400).json({ success: false });
        const msg = await MessageModel.create({ user_id, sender_type: 'admin', content: content.trim() });
        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
