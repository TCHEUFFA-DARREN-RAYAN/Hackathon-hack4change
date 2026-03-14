const express = require('express');
const router = express.Router();
const ResourceModel = require('../models/resource.model');

// Public - no auth required for browsing resources
router.get('/', async (req, res) => {
    try {
        const type = req.query.type;
        const resources = await ResourceModel.findAll(type ? { type } : {});
        res.json({ success: true, data: resources });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await ResourceModel.findById(req.params.id);
        if (!r) return res.status(404).json({ success: false });
        res.json({ success: true, data: r });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
