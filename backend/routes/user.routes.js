const express = require('express');
const router = express.Router();
const UserModel = require('../models/user.model');
const ResourceModel = require('../models/resource.model');
const AidRequestModel = require('../models/aidRequest.model');
const MessageModel = require('../models/message.model');

// Guest user for anonymous access (homeless users don't need to log in)
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';

router.get('/profile', async (req, res) => {
    try {
        res.json({ success: true, data: { name: 'Community member', email: null, userType: 'community' } });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/resources', async (req, res) => {
    try {
        const type = req.query.type;
        const resources = await ResourceModel.findAll(type ? { type } : {});
        res.json({ success: true, data: resources });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/resources/:id', async (req, res) => {
    try {
        const r = await ResourceModel.findById(req.params.id);
        if (!r) return res.status(404).json({ success: false });
        res.json({ success: true, data: r });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/requests', async (req, res) => {
    try {
        const list = await AidRequestModel.findByUser(GUEST_USER_ID);
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/requests', async (req, res) => {
    try {
        const { resource_id, type, notes } = req.body;
        const req_ = await AidRequestModel.create({
            user_id: GUEST_USER_ID,
            resource_id: resource_id || null,
            type: type || 'general',
            notes
        });
        res.status(201).json({ success: true, data: req_ });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const list = await MessageModel.findByUser(GUEST_USER_ID);
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/messages', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ success: false });
        const msg = await MessageModel.create({
            user_id: GUEST_USER_ID,
            sender_type: 'user',
            content: content.trim()
        });
        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
