/**
 * Coordinator routes — requires coordinator role.
 * Full network visibility: all orgs, all donations, all needs.
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const msg = errors.array().map(e => e.msg).join('; ');
        return res.status(400).json({ success: false, message: msg });
    }
    next();
};
const OrganizationModel = require('../models/organization.model');
const StaffModel = require('../models/staff.model');
const NeedsModel = require('../models/needs.model');
const InventoryModel = require('../models/inventory.model');
const DonationModel = require('../models/donation.model');
const SurplusRequestModel = require('../models/surplusRequest.model');
const SurplusTransferModel = require('../models/surplusTransfer.model');
const ChatThreadModel = require('../models/chatThread.model');
const ChatMessageModel = require('../models/chatMessage.model');
const { promisePool } = require('../config/database');

router.use(authenticateToken, requireAdmin);

// GET /api/coordinator/overview — network stats for dashboard header
router.get('/overview', async (req, res) => {
    try {
        const [orgCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM organizations`);
        const [needsCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM needs WHERE fulfilled = 0`);
        const [criticalCount] = await promisePool.query(`SELECT COUNT(*) AS total FROM needs WHERE fulfilled = 0 AND urgency = 'critical'`);
        const [expiringCount] = await promisePool.query(
            `SELECT COUNT(*) AS total FROM inventory_items 
             WHERE expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()`
        );
        const pipeline = await DonationModel.getPipelineCounts();

        res.json({
            success: true,
            data: {
                total_orgs: orgCount[0].total,
                active_needs: needsCount[0].total,
                critical_needs: criticalCount[0].total,
                expiring_soon: expiringCount[0].total,
                donations: pipeline
            }
        });
    } catch (err) {
        logger.error('Failed to load overview', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load overview' });
    }
});

// GET /api/coordinator/orgs — all orgs with stats
router.get('/orgs', async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAllWithStats();
        res.json({ success: true, data: orgs });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load organizations' });
    }
});

router.post('/orgs', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').isIn(['shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach']).withMessage('Invalid category')
], handleValidation, async (req, res) => {
    try {
        const org = await OrganizationModel.create(req.body);
        res.status(201).json({ success: true, data: org });
    } catch (err) {
        logger.error('Failed to create organization', { error: err.message });
        res.status(400).json({ success: false, message: err.message || 'Failed to create organization' });
    }
});

router.patch('/orgs/:id', [
    param('id').isUUID().withMessage('Invalid organization ID'),
    body('name').optional().trim().notEmpty(),
    body('category').optional().isIn(['shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach'])
], handleValidation, async (req, res) => {
    try {
        const org = await OrganizationModel.update(req.params.id, req.body);
        if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
        res.json({ success: true, data: org });
    } catch (err) {
        logger.error('Failed to update organization', { error: err.message });
        res.status(400).json({ success: false, message: err.message || 'Failed to update organization' });
    }
});

// Staff management
router.get('/staff', async (req, res) => {
    try {
        const { org_id } = req.query;
        const staff = await StaffModel.findAll({ org_id: org_id || undefined });
        res.json({ success: true, data: staff });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load staff' });
    }
});

router.post('/staff', [
    body('org_id').isUUID().withMessage('Valid organization ID is required'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidation, async (req, res) => {
    try {
        const { org_id, first_name, last_name, email, password } = req.body;
        const staff = await StaffModel.create({ org_id, first_name, last_name, email, password });
        res.status(201).json({ success: true, data: staff });
    } catch (err) {
        logger.error('Failed to create staff', { error: err.message });
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        res.status(500).json({ success: false, message: err.message || 'Failed to create staff' });
    }
});

router.patch('/staff/:id', [
    param('id').isUUID().withMessage('Invalid staff ID'),
    body('status').optional().isIn(['active', 'inactive']),
    body('email').optional().isEmail(),
    body('first_name').optional().trim().notEmpty(),
    body('last_name').optional().trim().notEmpty()
], handleValidation, async (req, res) => {
    try {
        const { first_name, last_name, email, status } = req.body;
        if (status !== undefined) {
            const updated = await StaffModel.updateStatus(req.params.id, status);
            if (!updated) return res.status(404).json({ success: false, message: 'Staff not found' });
        }
        const updates = {};
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (email !== undefined) updates.email = email;
        if (Object.keys(updates).length > 0) {
            const staff = await StaffModel.update(req.params.id, updates);
            if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        }
        const staff = await StaffModel.findById(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        res.json({ success: true, data: staff });
    } catch (err) {
        logger.error('Failed to update staff', { error: err.message });
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        res.status(500).json({ success: false, message: err.message || 'Failed to update staff' });
    }
});

router.delete('/staff/:id', [param('id').isUUID().withMessage('Invalid staff ID')], handleValidation, async (req, res) => {
    try {
        const deleted = await StaffModel.delete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Staff not found' });
        res.json({ success: true });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to delete staff' });
    }
});

// GET /api/coordinator/needs — all needs across network
router.get('/needs', async (req, res) => {
    try {
        const { urgency, category, search, org_id } = req.query;
        const needs = await NeedsModel.findAll({ urgency, category, search, org_id: org_id || undefined });
        res.json({ success: true, data: needs });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load needs' });
    }
});

// GET /api/coordinator/donations — full donations pipeline
router.get('/donations', async (req, res) => {
    try {
        const { status, org_id } = req.query;
        const donations = await DonationModel.findAll({ status, orgId: org_id || undefined });
        res.json({ success: true, data: donations });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
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
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to update donation' });
    }
});

// GET /api/coordinator/inventory — all inventory across orgs (with filters)
router.get('/inventory', async (req, res) => {
    try {
        const { org_id, status, category, search } = req.query;
        let sql = `SELECT i.*, o.name AS org_name
                   FROM inventory_items i
                   JOIN organizations o ON o.id = i.org_id
                   WHERE 1=1`;
        const params = [];
        if (org_id) {
            sql += ' AND i.org_id = ?';
            params.push(org_id);
        }
        if (status) {
            sql += ' AND i.status = ?';
            params.push(status);
        }
        if (category) {
            sql += ' AND i.category = ?';
            params.push(category);
        }
        if (search && search.trim()) {
            sql += ' AND (i.item_name LIKE ? OR i.category LIKE ?)';
            const term = '%' + search.trim() + '%';
            params.push(term, term);
        }
        sql += ' ORDER BY o.name ASC, i.item_name ASC';
        const [rows] = await promisePool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load inventory' });
    }
});

// GET /api/coordinator/surplus — all surplus inventory items for matching
router.get('/surplus', async (req, res) => {
    try {
        const items = await InventoryModel.findAllSurplus();
        res.json({ success: true, data: items });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load surplus' });
    }
});

// GET /api/coordinator/expiring — items expiring soon (7–30 days)
router.get('/expiring', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const items = await InventoryModel.findExpiringSoon(days);
        res.json({ success: true, data: items });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load expiring items' });
    }
});

// Surplus requests (staff-initiated)
router.get('/surplus-requests', async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const [rows] = await promisePool.query(
            `SELECT sr.*, o_from.name AS from_org_name, o_to.name AS requesting_org_name,
                    i.item_name, i.category, i.quantity AS available_quantity, i.unit
             FROM surplus_requests sr
             JOIN organizations o_from ON o_from.id = sr.from_org_id
             JOIN organizations o_to ON o_to.id = sr.requesting_org_id
             JOIN inventory_items i ON i.id = sr.inventory_item_id
             WHERE sr.status = ?
             ORDER BY sr.created_at ASC`,
            [status]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load surplus requests' });
    }
});

router.patch('/surplus-requests/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const request = await SurplusRequestModel.updateStatus(req.params.id, status);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        res.json({ success: true, data: request });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to update request' });
    }
});

// Surplus transfers (coordinator-initiated)
router.get('/transfers', async (req, res) => {
    try {
        const transfers = await SurplusTransferModel.findAll(req.query);
        res.json({ success: true, data: transfers });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load transfers' });
    }
});

router.post('/transfers', async (req, res) => {
    try {
        const { from_org_id, to_org_id, inventory_item_id, quantity, coordinator_notes } = req.body;
        if (!from_org_id || !to_org_id || !inventory_item_id) {
            return res.status(400).json({ success: false, message: 'from_org_id, to_org_id, and inventory_item_id are required' });
        }
        const item = await InventoryModel.findById(inventory_item_id);
        if (!item || item.org_id !== from_org_id) {
            return res.status(400).json({ success: false, message: 'Invalid surplus item' });
        }
        const qty = Math.min(parseInt(quantity) || 1, item.quantity);
        const transfer = await SurplusTransferModel.create({
            from_org_id,
            to_org_id,
            inventory_item_id,
            quantity: qty,
            coordinator_notes
        });
        res.status(201).json({ success: true, data: transfer });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to create transfer' });
    }
});

router.patch('/transfers/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['in_transit', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const transfer = await SurplusTransferModel.updateStatus(req.params.id, status);
        if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });
        res.json({ success: true, data: transfer });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to update transfer' });
    }
});

// GET /api/coordinator/analytics — analytics for time period
router.get('/analytics', async (req, res) => {
    try {
        const { from, to, org_id } = req.query;
        const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const toDate = to || new Date().toISOString().slice(0, 10);
        const orgFilter = org_id ? ' AND org_id = ?' : '';
        const orgParams = org_id ? [org_id] : [];

        const [donationsByStatus] = await promisePool.query(
            `SELECT status, COUNT(*) AS count FROM donations
             WHERE DATE(created_at) BETWEEN ? AND ? ${org_id ? 'AND (matched_org_id = ? OR preferred_org_id = ?)' : ''}
             GROUP BY status`,
            org_id ? [fromDate, toDate, org_id, org_id] : [fromDate, toDate]
        );
        const [donationsDelivered] = await promisePool.query(
            `SELECT COUNT(*) AS count FROM donations
             WHERE status = 'delivered' AND DATE(updated_at) BETWEEN ? AND ?
             ${org_id ? 'AND matched_org_id = ?' : ''}`,
            org_id ? [fromDate, toDate, org_id] : [fromDate, toDate]
        );
        const [needsFulfilled] = await promisePool.query(
            `SELECT COUNT(*) AS count FROM needs
             WHERE fulfilled = 1 AND fulfilled_at IS NOT NULL AND DATE(fulfilled_at) BETWEEN ? AND ? ${orgFilter}`,
            org_id ? [fromDate, toDate, org_id] : [fromDate, toDate]
        );
        const [transfersCompleted] = await promisePool.query(
            `SELECT COUNT(*) AS count FROM surplus_transfers st
             WHERE st.status = 'completed' AND st.completed_at IS NOT NULL AND DATE(st.completed_at) BETWEEN ? AND ?
             ${org_id ? 'AND (st.from_org_id = ? OR st.to_org_id = ?)' : ''}`,
            org_id ? [fromDate, toDate, org_id, org_id] : [fromDate, toDate]
        );
        const [donationsByDay] = await promisePool.query(
            `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM donations
             WHERE DATE(created_at) BETWEEN ? AND ? ${org_id ? 'AND (matched_org_id = ? OR preferred_org_id = ?)' : ''}
             GROUP BY DATE(created_at) ORDER BY day`,
            org_id ? [fromDate, toDate, org_id, org_id] : [fromDate, toDate]
        );
        const [needsByUrgency] = await promisePool.query(
            `SELECT urgency, COUNT(*) AS count FROM needs
             WHERE 1=1 ${orgFilter}
             GROUP BY urgency`,
            orgParams
        );
        const [needsByCategory] = await promisePool.query(
            `SELECT category, COUNT(*) AS count FROM needs
             WHERE 1=1 ${orgFilter}
             GROUP BY category ORDER BY count DESC LIMIT 10`,
            orgParams
        );

        const pipeline = { pending: 0, matched: 0, confirmed: 0, delivered: 0 };
        donationsByStatus.forEach(r => { pipeline[r.status] = r.count; });

        const urgencyMap = {};
        needsByUrgency.forEach(r => { urgencyMap[r.urgency] = r.count; });
        const categoryMap = {};
        needsByCategory.forEach(r => { categoryMap[r.category] = r.count; });

        res.json({
            success: true,
            data: {
                period: { from: fromDate, to: toDate },
                donations_pipeline: pipeline,
                donations_delivered: donationsDelivered[0].count,
                needs_fulfilled: needsFulfilled[0].count,
                transfers_completed: transfersCompleted[0].count,
                donations_by_day: donationsByDay,
                needs_by_urgency: urgencyMap,
                needs_by_category: categoryMap
            }
        });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load analytics' });
    }
});

// Export helpers — all support ?org_id= for per-org export
function escapeCsv(val) {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

router.get('/export/needs', async (req, res) => {
    try {
        const { org_id } = req.query;
        let sql = `SELECT n.*, o.name AS org_name FROM needs n JOIN organizations o ON o.id = n.org_id WHERE 1=1`;
        const params = [];
        if (org_id) { sql += ' AND n.org_id = ?'; params.push(org_id); }
        sql += ' ORDER BY o.name, n.created_at DESC';
        const [needs] = await promisePool.query(sql, params);
        const header = 'Organization,Item,Category,Quantity Needed,Unit,Urgency,Fulfilled,Fulfilled At,Notes,Posted\n';
        const rows = needs.map(n =>
            [escapeCsv(n.org_name), escapeCsv(n.item_name), escapeCsv(n.category), n.quantity_needed, escapeCsv(n.unit), escapeCsv(n.urgency),
                n.fulfilled ? 'Yes' : 'No', n.fulfilled_at ? new Date(n.fulfilled_at).toLocaleDateString('en-CA') : '',
                escapeCsv((n.notes || '').replace(/,/g, ';')), new Date(n.created_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-needs${org_id ? '-org' : ''}.csv"`);
        res.send(header + rows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/inventory', async (req, res) => {
    try {
        const { org_id } = req.query;
        let sql = `SELECT o.name AS org_name, i.item_name, i.category, i.quantity, i.unit, i.status, i.expiry_date, i.updated_at
                   FROM inventory_items i JOIN organizations o ON o.id = i.org_id WHERE 1=1`;
        const params = [];
        if (org_id) { sql += ' AND i.org_id = ?'; params.push(org_id); }
        sql += ' ORDER BY o.name, i.item_name';
        const [items] = await promisePool.query(sql, params);
        const header = 'Organization,Item,Category,Quantity,Unit,Status,Expiry,Last Updated\n';
        const rows = items.map(i =>
            [escapeCsv(i.org_name), escapeCsv(i.item_name), escapeCsv(i.category), i.quantity, escapeCsv(i.unit), escapeCsv(i.status),
                i.expiry_date ? new Date(i.expiry_date).toLocaleDateString('en-CA') : '',
                new Date(i.updated_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-inventory${org_id ? '-org' : ''}.csv"`);
        res.send(header + rows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/donations', async (req, res) => {
    try {
        const { org_id, from, to } = req.query;
        let sql = `SELECT d.*, po.name AS preferred_org_name, mo.name AS matched_org_name
                   FROM donations d
                   LEFT JOIN organizations po ON po.id = d.preferred_org_id
                   LEFT JOIN organizations mo ON mo.id = d.matched_org_id WHERE 1=1`;
        const params = [];
        if (org_id) { sql += ' AND (d.matched_org_id = ? OR d.preferred_org_id = ?)'; params.push(org_id, org_id); }
        if (from) { sql += ' AND DATE(d.created_at) >= ?'; params.push(from); }
        if (to) { sql += ' AND DATE(d.created_at) <= ?'; params.push(to); }
        sql += ' ORDER BY d.created_at DESC';
        const [donations] = await promisePool.query(sql, params);
        const header = 'Item,Category,Qty,Unit,Donor,Email,Status,Preferred Org,Matched Org,Created,Updated\n';
        const rows = donations.map(d =>
            [escapeCsv(d.item_name), escapeCsv(d.category), d.quantity, escapeCsv(d.unit), escapeCsv(d.donor_name), escapeCsv(d.donor_email),
                escapeCsv(d.status), escapeCsv(d.preferred_org_name), escapeCsv(d.matched_org_name),
                new Date(d.created_at).toLocaleDateString('en-CA'), new Date(d.updated_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-donations${org_id ? '-org' : ''}.csv"`);
        res.send(header + rows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/organizations', async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAllWithStats();
        const header = 'Organization,Category,Address,Contact Email,Phone,Website,Critical Needs,Total Needs,Surplus Items,Last Inventory Update\n';
        const rows = orgs.map(o =>
            [escapeCsv(o.name), escapeCsv(o.category), escapeCsv(o.address), escapeCsv(o.contact_email), escapeCsv(o.contact_phone), escapeCsv(o.website),
                o.critical_needs || 0, o.total_needs || 0, o.surplus_items || 0,
                o.last_inventory_update ? new Date(o.last_inventory_update).toLocaleDateString('en-CA') : '']
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="gmhsc-organizations.csv"');
        res.send(header + rows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/staff', async (req, res) => {
    try {
        const { org_id } = req.query;
        const staff = await StaffModel.findAll({ org_id: org_id || undefined });
        const header = 'Name,Email,Organization,Status,Created\n';
        const rows = staff.map(s =>
            [escapeCsv(`${s.first_name} ${s.last_name}`), escapeCsv(s.email), escapeCsv(s.org_name), escapeCsv(s.status), new Date(s.created_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-staff${org_id ? '-org' : ''}.csv"`);
        res.send(header + rows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/surplus-requests', async (req, res) => {
    try {
        const { org_id } = req.query;
        let sql = `SELECT sr.*, o_from.name AS from_org_name, o_to.name AS requesting_org_name, i.item_name, i.category, sr.quantity_requested, i.unit
                   FROM surplus_requests sr
                   JOIN organizations o_from ON o_from.id = sr.from_org_id
                   JOIN organizations o_to ON o_to.id = sr.requesting_org_id
                   JOIN inventory_items i ON i.id = sr.inventory_item_id WHERE 1=1`;
        const params = [];
        if (org_id) { sql += ' AND (sr.from_org_id = ? OR sr.requesting_org_id = ?)'; params.push(org_id, org_id); }
        sql += ' ORDER BY sr.created_at DESC';
        const [rows] = await promisePool.query(sql, params);
        const header = 'From Org,Requesting Org,Item,Category,Qty Requested,Unit,Status,Created\n';
        const csvRows = rows.map(r =>
            [escapeCsv(r.from_org_name), escapeCsv(r.requesting_org_name), escapeCsv(r.item_name), escapeCsv(r.category), r.quantity_requested, escapeCsv(r.unit), escapeCsv(r.status), new Date(r.created_at).toLocaleDateString('en-CA')]
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-surplus-requests${org_id ? '-org' : ''}.csv"`);
        res.send(header + csvRows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

router.get('/export/transfers', async (req, res) => {
    try {
        const { org_id } = req.query;
        let sql = `SELECT st.*, o_from.name AS from_org_name, o_to.name AS to_org_name, i.item_name, i.category, st.quantity, i.unit
                   FROM surplus_transfers st
                   JOIN organizations o_from ON o_from.id = st.from_org_id
                   JOIN organizations o_to ON o_to.id = st.to_org_id
                   JOIN inventory_items i ON i.id = st.inventory_item_id WHERE 1=1`;
        const params = [];
        if (org_id) { sql += ' AND (st.from_org_id = ? OR st.to_org_id = ?)'; params.push(org_id, org_id); }
        sql += ' ORDER BY st.created_at DESC';
        const [rows] = await promisePool.query(sql, params);
        const header = 'From Org,To Org,Item,Category,Qty,Unit,Status,Created,Completed\n';
        const csvRows = rows.map(r =>
            [escapeCsv(r.from_org_name), escapeCsv(r.to_org_name), escapeCsv(r.item_name), escapeCsv(r.category), r.quantity, escapeCsv(r.unit), escapeCsv(r.status), new Date(r.created_at).toLocaleDateString('en-CA'), r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-CA') : '']
            .join(',')
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-transfers${org_id ? '-org' : ''}.csv"`);
        res.send(header + csvRows);
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

// --- Chat ---
router.get('/chat/threads', async (req, res) => {
    try {
        const threads = await ChatThreadModel.findForCoordinator();
        res.json({ success: true, data: threads });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load chat threads' });
    }
});

router.get('/chat/threads/:id/messages', [
    param('id').isUUID().withMessage('Invalid thread ID')
], handleValidation, async (req, res) => {
    try {
        const thread = await ChatThreadModel.findById(req.params.id);
        if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });
        const messages = await ChatMessageModel.findByThread(req.params.id);
        res.json({ success: true, data: messages });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to load messages' });
    }
});

router.post('/chat/threads', [
    body('staff_id').optional().isUUID().withMessage('Valid staff ID required for direct chat')
], handleValidation, async (req, res) => {
    try {
        const { staff_id } = req.body;
        if (!staff_id) {
            return res.status(400).json({ success: false, message: 'staff_id is required to create direct chat' });
        }
        const thread = await ChatThreadModel.findOrCreateDirectThread(staff_id);
        res.status(201).json({ success: true, data: thread });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to create chat thread' });
    }
});

router.post('/chat/threads/:id/messages', [
    param('id').isUUID().withMessage('Invalid thread ID'),
    body('content').trim().notEmpty().withMessage('Message content is required')
], handleValidation, async (req, res) => {
    try {
        const thread = await ChatThreadModel.findById(req.params.id);
        if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });
        const msg = await ChatMessageModel.create({
            thread_id: req.params.id,
            sender_type: 'coordinator',
            sender_id: req.user.id,
            content: req.body.content
        });
        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Meeting report — summary CSV for meetings (period + optional org)
router.get('/export/meeting-report', async (req, res) => {
    try {
        const { from, to, org_id } = req.query;
        const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const toDate = to || new Date().toISOString().slice(0, 10);
        const orgName = org_id ? (await OrganizationModel.findById(org_id))?.name : 'All Organizations';

        const [[{ delivered }]] = await promisePool.query(
            `SELECT COUNT(*) AS delivered FROM donations WHERE status = 'delivered' AND DATE(updated_at) BETWEEN ? AND ? ${org_id ? 'AND matched_org_id = ?' : ''}`,
            org_id ? [fromDate, toDate, org_id] : [fromDate, toDate]
        );
        const [[{ fulfilled }]] = await promisePool.query(
            `SELECT COUNT(*) AS fulfilled FROM needs WHERE fulfilled = 1 AND fulfilled_at IS NOT NULL AND DATE(fulfilled_at) BETWEEN ? AND ? ${org_id ? 'AND org_id = ?' : ''}`,
            org_id ? [fromDate, toDate, org_id] : [fromDate, toDate]
        );
        const [[{ transfers }]] = await promisePool.query(
            `SELECT COUNT(*) AS transfers FROM surplus_transfers WHERE status = 'completed' AND completed_at IS NOT NULL AND DATE(completed_at) BETWEEN ? AND ? ${org_id ? 'AND (from_org_id = ? OR to_org_id = ?)' : ''}`,
            org_id ? [fromDate, toDate, org_id, org_id] : [fromDate, toDate]
        );
        const pipeline = await DonationModel.getPipelineCounts();

        const lines = [
            `GMHSC Network — Meeting Report`,
            `Period: ${fromDate} to ${toDate}`,
            `Scope: ${orgName}`,
            ``,
            `Summary`,
            `Donations delivered (period): ${delivered}`,
            `Needs fulfilled (period): ${fulfilled}`,
            `Transfers completed (period): ${transfers}`,
            ``,
            `Current pipeline`,
            `Pending: ${pipeline.pending}`,
            `Matched: ${pipeline.matched}`,
            `Confirmed: ${pipeline.confirmed}`,
            `Delivered (total): ${pipeline.delivered}`,
            ``,
            `Generated: ${new Date().toISOString()}`
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmhsc-meeting-report-${fromDate}-${toDate}.csv"`);
        res.send(lines.join('\n'));
    } catch (err) {
        logger.error(err.message || 'Request failed', { error: err.message });
        res.status(500).json({ success: false, message: 'Export failed' });
    }
});

module.exports = router;
