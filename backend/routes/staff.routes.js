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
const SurplusRequestModel = require('../models/surplusRequest.model');
const SurplusTransferModel = require('../models/surplusTransfer.model');
const ChatThreadModel = require('../models/chatThread.model');
const ChatMessageModel = require('../models/chatMessage.model');

// All staff routes require authentication
router.use(authenticateToken);

// Middleware: ensure the user is a staff member (not coordinator-only)
// For chat, staff-only: coordinator uses /api/coordinator/chat
router.use((req, res, next) => {
    if (req.user.role !== 'staff' && req.user.role !== 'coordinator') {
        return res.status(403).json({ success: false, message: 'Staff access required' });
    }
    next();
});

// Chat: staff-only (coordinator uses coordinator routes)
const staffOnlyChat = (req, res, next) => {
    if (req.path.startsWith('/chat') && req.user.role !== 'staff') {
        return res.status(403).json({ success: false, message: 'Staff chat access only' });
    }
    next();
};
router.use(staffOnlyChat);

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
        const { item_name, category, quantity, target_quantity, unit, expiry_date, notes } = req.body;
        if (!item_name || !category) {
            return res.status(400).json({ success: false, message: 'Item name and category are required' });
        }
        const item = await InventoryModel.create({
            org_id: req.user.orgId, item_name, category, quantity, target_quantity, unit, expiry_date, notes
        });
        res.status(201).json({ success: true, data: item });
    } catch (err) {
        if (err.code === 'DUPLICATE_INVENTORY') {
            return res.status(409).json({ success: false, message: err.message });
        }
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
        let needs = await NeedsModel.findByOrg(req.user.orgId);
        if (req.query.urgency) needs = needs.filter(n => n.urgency === req.query.urgency);
        if (req.query.fulfilled === 'false') needs = needs.filter(n => !n.fulfilled);
        if (req.query.fulfilled === 'true') needs = needs.filter(n => !!n.fulfilled);
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
        const io = req.app.get('io');
        if (io) io.emit('need:new', { item_name, urgency, org_name: req.user.orgName });
        res.status(201).json({ success: true, data: need });
    } catch (err) {
        if (err.code === 'DUPLICATE_NEED') {
            return res.status(409).json({ success: false, message: err.message });
        }
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
        const io = req.app.get('io');
        if (io) io.emit('need:fulfilled', { org_name: req.user.orgName });
        res.json({ success: true, data: need });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark need fulfilled' });
    }
});

// Log receipt: increment quantity_received, reduce quantity_needed, add to inventory
router.post('/needs/:id/receive', async (req, res) => {
    try {
        const amount = parseInt(req.body.amount, 10);
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'amount must be a positive integer' });
        }
        const need = await NeedsModel.recordReceipt(req.params.id, req.user.orgId, amount);
        if (!need) return res.status(404).json({ success: false, message: 'Need not found' });
        await InventoryModel.addQuantityForNeed(
            req.user.orgId,
            need.item_name,
            need.category,
            need.unit,
            amount
        );
        const io = req.app.get('io');
        if (io && need.fulfilled) io.emit('need:fulfilled', { org_name: req.user.orgName });
        res.json({ success: true, data: need });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to record receipt' });
    }
});

// Send a fulfillment offer message to another org's channel
router.post('/fulfill-offer', async (req, res) => {
    try {
        const { targetOrgId, message } = req.body;
        if (!targetOrgId || !message) {
            return res.status(400).json({ success: false, message: 'targetOrgId and message are required' });
        }
        const thread = await ChatThreadModel.findOrCreateOrgChannel(targetOrgId);
        const msg = await ChatMessageModel.create({
            thread_id: thread.id,
            sender_type: 'staff',
            sender_id: req.user.id,
            content: message.trim()
        });
        res.json({ success: true, data: msg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send offer' });
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
        let donations = await DonationModel.findByMatchedOrg(req.user.orgId);
        if (req.query.status) donations = donations.filter(d => d.status === req.query.status);
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
        await InventoryModel.addQuantityForNeed(
            req.user.orgId,
            donation.item_name,
            donation.category || 'other',
            donation.unit || 'items',
            Number(donation.quantity) || 1
        );
        res.json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to confirm donation' });
    }
});

router.post('/donations/:id/pending', async (req, res) => {
    try {
        const donation = await DonationModel.updateStatus(req.params.id, 'matched');
        if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
        res.json({ success: true, data: donation });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update donation' });
    }
});

// --- Network surplus (org-to-org) ---

router.get('/surplus', async (req, res) => {
    try {
        const items = await InventoryModel.findAllSurplus();
        const filtered = items.filter(i => i.org_id !== req.user.orgId);
        res.json({ success: true, data: filtered });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load surplus' });
    }
});

router.get('/surplus-requests', async (req, res) => {
    try {
        let requests = await SurplusRequestModel.findByRequestingOrg(req.user.orgId);
        if (req.query.status) requests = requests.filter(r => r.status === req.query.status);
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load surplus requests' });
    }
});

router.post('/surplus-requests', async (req, res) => {
    try {
        const { from_org_id, inventory_item_id, quantity_requested, notes } = req.body;
        if (!from_org_id || !inventory_item_id) {
            return res.status(400).json({ success: false, message: 'from_org_id and inventory_item_id are required' });
        }
        const item = await InventoryModel.findById(inventory_item_id);
        if (!item || item.org_id !== from_org_id) {
            return res.status(400).json({ success: false, message: 'Invalid surplus item' });
        }
        if (item.org_id === req.user.orgId) {
            return res.status(400).json({ success: false, message: 'Cannot request your own surplus' });
        }
        const qty = Math.min(parseInt(quantity_requested) || 1, item.quantity);
        const request = await SurplusRequestModel.create({
            requesting_org_id: req.user.orgId,
            from_org_id,
            inventory_item_id,
            quantity_requested: qty,
            notes
        });
        res.status(201).json({ success: true, data: request });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create surplus request' });
    }
});

router.get('/transfers', async (req, res) => {
    try {
        let incoming = await SurplusTransferModel.findByToOrg(req.user.orgId);
        if (req.query.status) incoming = incoming.filter(t => t.status === req.query.status);
        res.json({ success: true, data: incoming });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load transfers' });
    }
});

router.post('/transfers/:id/complete', async (req, res) => {
    try {
        const transfer = await SurplusTransferModel.findById(req.params.id);
        if (!transfer || transfer.to_org_id !== req.user.orgId) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        const updated = await SurplusTransferModel.updateStatus(req.params.id, 'completed');
        res.json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to complete transfer' });
    }
});

router.get('/expiring', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const items = await InventoryModel.findExpiringSoon(days, req.user.orgId);
        res.json({ success: true, data: items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load expiring items' });
    }
});

// --- Chat ---
router.get('/chat/threads', async (req, res) => {
    try {
        // Ensure staff has org channel and direct thread (lazy-create direct)
        await ChatThreadModel.findOrCreateOrgChannel(req.user.orgId);
        await ChatThreadModel.findOrCreateDirectThread(req.user.id);
        const threads = await ChatThreadModel.findForStaff(req.user.orgId, req.user.id);
        res.json({ success: true, data: threads });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load chat threads' });
    }
});

router.post('/chat/cross-org', async (req, res) => {
    try {
        const { peer_org_id } = req.body;
        if (!peer_org_id || typeof peer_org_id !== 'string') {
            return res.status(400).json({ success: false, message: 'peer_org_id is required' });
        }
        if (peer_org_id === req.user.orgId) {
            return res.status(400).json({ success: false, message: 'Cannot start a cross-org thread with your own organisation' });
        }
        const thread = await ChatThreadModel.findOrCreateCrossOrgThread(req.user.orgId, peer_org_id);
        res.status(201).json({ success: true, data: thread });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create cross-org thread' });
    }
});

router.get('/chat/threads/:id/messages', async (req, res) => {
    try {
        const threads = await ChatThreadModel.findForStaff(req.user.orgId, req.user.id);
        const allowed = threads.some(t => t.id === req.params.id);
        if (!allowed) return res.status(404).json({ success: false, message: 'Thread not found' });
        const messages = await ChatMessageModel.findByThread(req.params.id);
        res.json({ success: true, data: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load messages' });
    }
});

router.post('/chat/threads/:id/messages', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !String(content).trim()) {
            return res.status(400).json({ success: false, message: 'Message content is required' });
        }
        const threads = await ChatThreadModel.findForStaff(req.user.orgId, req.user.id);
        const allowed = threads.some(t => t.id === req.params.id);
        if (!allowed) return res.status(404).json({ success: false, message: 'Thread not found' });
        const msg = await ChatMessageModel.create({
            thread_id: req.params.id,
            sender_type: 'staff',
            sender_id: req.user.id,
            content: String(content).trim()
        });
        const io = req.app.get('io');
        if (io) io.emit('chat:newMessage', { threadId: req.params.id, senderId: req.user.id });
        res.status(201).json({ success: true, data: msg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

module.exports = router;
