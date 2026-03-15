/**
 * Public routes — no authentication required.
 * Needs board, organizations list, donation submission.
 */
const express = require('express');
const router = express.Router();
const OrganizationModel = require('../models/organization.model');
const NeedsModel = require('../models/needs.model');
const DonationModel = require('../models/donation.model');
const { sendDonationConfirmation } = require('../utils/email');
const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

// GET /api/public/orgs-with-needs — needs board data
router.get('/orgs-with-needs', async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAllWithTopNeeds();
        res.json({ success: true, data: orgs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load needs board' });
    }
});

// GET /api/public/needs — all unfulfilled needs with filters
router.get('/needs', async (req, res) => {
    try {
        const { urgency, category, orgCategory, search } = req.query;
        const needs = await NeedsModel.findAll({ urgency, category, orgCategory, search });
        res.json({ success: true, data: needs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load needs' });
    }
});

// GET /api/public/organizations — for dropdown in donation form
router.get('/organizations', async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAll();
        res.json({ success: true, data: orgs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load organizations' });
    }
});

// POST /api/public/donations — submit a donation (no login required)
router.post('/donations', async (req, res) => {
    try {
        const { donor_name, donor_email, donor_phone, item_name, category, quantity, unit, condition, preferred_org_id } = req.body;

        if (!donor_name || !donor_email || !item_name || !category || !quantity) {
            return res.status(400).json({ success: false, message: 'Name, email, item, category, and quantity are required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)) {
            return res.status(400).json({ success: false, message: 'Valid email required' });
        }

        const donation = await DonationModel.create({
            donor_name, donor_email, donor_phone,
            item_name, category, quantity, unit, condition, preferred_org_id
        });

        const io = req.app.get('io');
        if (io) io.emit('donation:new', { item_name, category, quantity });

        res.status(201).json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to submit donation' });
    }
});

// PATCH /api/public/donations/:id/match — apply AI match result to a donation
router.patch('/donations/:id/match', async (req, res) => {
    try {
        const { org_id, reasoning } = req.body;
        if (!org_id) return res.status(400).json({ success: false, message: 'org_id required' });
        const donation = await DonationModel.applyMatch(req.params.id, org_id, reasoning || null);
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        sendDonationConfirmation(donation).catch(() => {});
        res.json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to apply match' });
    }
});

// GET /api/public/stats — public impact counters
router.get('/stats', async (req, res) => {
    try {
        const [[orgCount]] = await promisePool.query('SELECT COUNT(*) AS c FROM organizations');
        const [[needCount]] = await promisePool.query('SELECT COUNT(*) AS c FROM needs WHERE fulfilled = 0');
        const [[fulfilledCount]] = await promisePool.query('SELECT COUNT(*) AS c FROM needs WHERE fulfilled = 1');
        const [[donationCount]] = await promisePool.query('SELECT COUNT(*) AS c FROM donations');
        const [[deliveredCount]] = await promisePool.query("SELECT COUNT(*) AS c FROM donations WHERE status = 'delivered'");
        const [[itemsRedist]] = await promisePool.query("SELECT COALESCE(SUM(quantity), 0) AS c FROM surplus_transfers WHERE status = 'completed'");
        res.json({
            success: true,
            data: {
                organizations: orgCount.c,
                active_needs: needCount.c,
                needs_fulfilled: fulfilledCount.c,
                donations_received: donationCount.c,
                donations_delivered: deliveredCount.c,
                items_redistributed: itemsRedist.c
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load stats' });
    }
});

module.exports = router;
