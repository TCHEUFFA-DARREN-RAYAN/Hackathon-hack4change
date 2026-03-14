/**
 * Staff routes — requires authentication as staff member.
 * Scoped to the authenticated staff member's organization.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const InventoryModel = require('../models/inventory.model');
const NeedsModel = require('../models/needs.model');
const DonationModel = require('../models/donation.model');
const OrganizationModel = require('../models/organization.model');

// All staff routes require authentication
router.use(authenticateToken);

// Middleware: ensure the user is a staff member (not coordinator-only)
router.use((req, res, next) => {
    if (req.user.role !== 'staff' && req.user.role !== 'coordinator') {
        return res.status(403).json({ success: false, message: 'Staff access required' });
    }
    next();
});

// GET /api/staff/org — current org info
router.get('/org', async (req, res) => {
    try {
        const org = await OrganizationModel.findById(req.user.orgId);
        if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
        res.json({ success: true, data: org });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load organization' });
    }
});

// --- Inventory ---

router.get('/inventory', async (req, res) => {
    try {
        const items = await InventoryModel.findByOrg(req.user.orgId);
        res.json({ success: true, data: items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load inventory' });
    }
});

router.post('/inventory', async (req, res) => {
    try {
        const { item_name, category, quantity, unit, status, expiry_date, notes } = req.body;
        if (!item_name || !category) {
            return res.status(400).json({ success: false, message: 'Item name and category are required' });
        }
        const item = await InventoryModel.create({
            org_id: req.user.orgId, item_name, category, quantity, unit, status, expiry_date, notes
        });
        res.status(201).json({ success: true, data: item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create inventory item' });
    }
});

router.patch('/inventory/:id', async (req, res) => {
    try {
        const item = await InventoryModel.update(req.params.id, req.user.orgId, req.body);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true, data: item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update item' });
    }
});

router.delete('/inventory/:id', async (req, res) => {
    try {
        const ok = await InventoryModel.delete(req.params.id, req.user.orgId);
        if (!ok) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
});

// --- Needs ---

router.get('/needs', async (req, res) => {
    try {
        const needs = await NeedsModel.findByOrg(req.user.orgId);
        res.json({ success: true, data: needs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load needs' });
    }
});

router.post('/needs', async (req, res) => {
    try {
        const { item_name, category, quantity_needed, unit, urgency, notes } = req.body;
        if (!item_name || !category) {
            return res.status(400).json({ success: false, message: 'Item name and category are required' });
        }
        const need = await NeedsModel.create({
            org_id: req.user.orgId, item_name, category, quantity_needed, unit, urgency, notes
        });
        res.status(201).json({ success: true, data: need });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create need' });
    }
});

router.patch('/needs/:id', async (req, res) => {
    try {
        const need = await NeedsModel.update(req.params.id, req.user.orgId, req.body);
        if (!need) return res.status(404).json({ success: false, message: 'Need not found' });
        res.json({ success: true, data: need });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update need' });
    }
});

router.post('/needs/:id/fulfill', async (req, res) => {
    try {
        const need = await NeedsModel.markFulfilled(req.params.id, req.user.orgId);
        if (!need) return res.status(404).json({ success: false, message: 'Need not found' });
        res.json({ success: true, data: need });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark need fulfilled' });
    }
});

router.delete('/needs/:id', async (req, res) => {
    try {
        const ok = await NeedsModel.delete(req.params.id, req.user.orgId);
        if (!ok) return res.status(404).json({ success: false, message: 'Need not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete need' });
    }
});

// --- Incoming donations ---

router.get('/donations', async (req, res) => {
    try {
        const donations = await DonationModel.findByMatchedOrg(req.user.orgId);
        res.json({ success: true, data: donations });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load donations' });
    }
});

router.post('/donations/:id/confirm', async (req, res) => {
    try {
        const donation = await DonationModel.updateStatus(req.params.id, 'confirmed');
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        res.json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to confirm donation' });
    }
});

module.exports = router;
