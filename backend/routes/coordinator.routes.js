/**
 * Coordinator routes — requires coordinator role.
 * Full network visibility: all orgs, all donations, all needs.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const OrganizationModel = require('../models/organization.model');
const NeedsModel = require('../models/needs.model');
const InventoryModel = require('../models/inventory.model');
const DonationModel = require('../models/donation.model');
const { promisePool } = require('../config/database');

router.use(authenticateToken, requireAdmin);

// GET /api/coordinator/overview — network stats for dashboard header
router.get('/overview', async (req, res) => {
    try {
        const [orgCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM organizations`);
        const [needsCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM needs WHERE fulfilled = 0`);
        const [criticalCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM needs WHERE fulfilled = 0 AND urgency = 'critical'`);
        const pipeline = await DonationModel.getPipelineCounts();

        res.json({
            success: true,
            data: {
                total_orgs: orgCount[0].total,
                active_needs: needsCount[0].total,
                critical_needs: criticalCount[0].total,
                donations: pipeline
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load overview' });
    }
});

// GET /api/coordinator/orgs — all orgs with stats
router.get('/orgs', async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAllWithStats();
        res.json({ success: true, data: orgs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load organizations' });
    }
});

// GET /api/coordinator/needs — all needs across network
router.get('/needs', async (req, res) => {
    try {
        const { urgency, category, search } = req.query;
        const needs = await NeedsModel.findAll({ urgency, category, search });
        res.json({ success: true, data: needs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load needs' });
    }
});

// GET /api/coordinator/donations — full donations pipeline
router.get('/donations', async (req, res) => {
    try {
        const { status } = req.query;
        const donations = await DonationModel.findAll({ status });
        res.json({ success: true, data: donations });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load donations' });
    }
});

// PATCH /api/coordinator/donations/:id/status
router.patch('/donations/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const donation = await DonationModel.updateStatus(req.params.id, status);
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found or invalid status' });
        res.json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update donation' });
    }
});

// GET /api/coordinator/surplus — all surplus inventory items for matching
router.get('/surplus', async (req, res) => {
    try {
        const items = await InventoryModel.findAllSurplus();
        res.json({ success: true, data: items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load surplus' });
    }
});

// GET /api/coordinator/export/needs — CSV export
router.get('/export/needs', async (req, res) => {
    try {
        const needs = await NeedsModel.findAll({});
        const header = 'Organization,Item,Category,Quantity Needed,Unit,Urgency,Notes,Posted\n';
        const rows = needs.map(n =>
            [n.org_name, n.item_name, n.category, n.quantity_needed, n.unit, n.urgency,
                (n.notes || '').replace(/,/g, ';'), new Date(n.created_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="gmhsc-needs.csv"');
        res.send(header + rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

// GET /api/coordinator/export/inventory — CSV export
router.get('/export/inventory', async (req, res) => {
    try {
        const [items] = await promisePool.query(
            `SELECT o.name AS org_name, i.item_name, i.category, i.quantity, i.unit, i.status, i.expiry_date, i.updated_at
             FROM inventory_items i JOIN organizations o ON o.id = i.org_id ORDER BY o.name, i.item_name`
        );
        const header = 'Organization,Item,Category,Quantity,Unit,Status,Expiry,Last Updated\n';
        const rows = items.map(i =>
            [i.org_name, i.item_name, i.category, i.quantity, i.unit, i.status,
                i.expiry_date ? new Date(i.expiry_date).toLocaleDateString('en-CA') : '',
                new Date(i.updated_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="gmhsc-inventory.csv"');
        res.send(header + rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

module.exports = router;
