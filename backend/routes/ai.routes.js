/**
 * AI routes — Claude API integration.
 * POST /api/ai/match-donation — smart donation matching
 * POST /api/ai/network-insights — coordinator network health summary
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const NeedsModel = require('../models/needs.model');
const InventoryModel = require('../models/inventory.model');
const OrganizationModel = require('../models/organization.model');
const { promisePool } = require('../config/database');

const Anthropic = require('@anthropic-ai/sdk');

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many AI requests. Please wait a moment.' }
});

function getClient() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
    return new Anthropic({ apiKey: key });
}

// POST /api/ai/match-donation — public, called from donation form step 3
router.post('/match-donation', aiLimiter, async (req, res) => {
    try {
        const { item_name, category, quantity, condition } = req.body;
        if (!item_name || !category || !quantity) {
            return res.status(400).json({ success: false, message: 'item_name, category, and quantity are required' });
        }

        const needs = await NeedsModel.findAllUnfulfilled();
        if (!needs.length) {
            return res.json({ success: true, data: { matches: [], message: 'No active needs in the network right now.' } });
        }

        const needsSummary = needs.map(n =>
            `- ${n.org_name} (${n.org_category.replace('_', ' ')}): needs ${n.quantity_needed} ${n.unit} of "${n.item_name}" [urgency: ${n.urgency}]${n.notes ? ' — ' + n.notes : ''}`
        ).join('\n');

        const prompt = `You are a donation coordinator for the GMHSC network of 28 homeless-serving organizations in Moncton, New Brunswick.

A donor is offering the following item:
- Item: ${item_name}
- Category: ${category}
- Quantity: ${quantity}
- Condition: ${condition || 'good'}

Current unfulfilled needs across the network:
${needsSummary}

Task: Identify the top 3 organizations that are the best match for this donation. Rank them by:
1. How closely the item matches their stated need (name and category)
2. Urgency level (critical > high > medium > low)
3. Whether the donated quantity meaningfully covers their need

Respond with valid JSON only — no markdown, no explanation outside the JSON. Use this exact structure:
{
  "matches": [
    {
      "org_name": "...",
      "org_id_hint": "...",
      "urgency": "critical|high|medium|low",
      "reasoning": "One clear sentence explaining why this is a good match."
    }
  ]
}`;

        const client = getClient();
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
        let parsed;
        try {
            // Strip any markdown fences if present
            const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            return res.status(500).json({ success: false, message: 'AI returned an unexpected response. Please try again.' });
        }

        // Enrich matches with actual org data from DB
        const orgs = await OrganizationModel.findAll();
        const enriched = (parsed.matches || []).map(match => {
            const org = orgs.find(o => o.name.toLowerCase() === match.org_name.toLowerCase()) || null;
            return {
                org_id: org ? org.id : null,
                org_name: match.org_name,
                org_address: org ? org.address : null,
                org_email: org ? org.contact_email : null,
                urgency: match.urgency,
                reasoning: match.reasoning
            };
        }).filter(m => m.org_id);

        res.json({ success: true, data: { matches: enriched } });
    } catch (err) {
        console.error('AI match-donation error:', err.message);
        if (err.message.includes('ANTHROPIC_API_KEY')) {
            return res.status(503).json({ success: false, message: 'AI matching is not configured. Please set ANTHROPIC_API_KEY.' });
        }
        res.status(500).json({ success: false, message: 'AI matching failed. Please try again.' });
    }
});

// POST /api/ai/network-insights — coordinator only
router.post('/network-insights', authenticateToken, requireAdmin, aiLimiter, async (req, res) => {
    try {
        const orgs = await OrganizationModel.findAllWithStats();
        const needs = await NeedsModel.findAll({});
        const surplus = await InventoryModel.findAllSurplus();

        // Flag orgs that haven't updated inventory in 48 hours
        const now = Date.now();
        const staleOrgs = orgs.filter(o => {
            if (!o.last_inventory_update) return true;
            const diff = now - new Date(o.last_inventory_update).getTime();
            return diff > 48 * 60 * 60 * 1000;
        }).map(o => o.name);

        const criticalNeeds = needs.filter(n => n.urgency === 'critical');
        const surplusList = surplus.slice(0, 20);

        const prompt = `You are an analyst for the GMHSC network — 28 homeless-serving organizations in Moncton, NB.

NETWORK SNAPSHOT:
- Total organizations: ${orgs.length}
- Unfulfilled needs: ${needs.length} (${criticalNeeds.length} critical)
- Surplus items available for redistribution: ${surplus.length}
- Organizations with no inventory update in 48+ hours: ${staleOrgs.length > 0 ? staleOrgs.join(', ') : 'None'}

TOP CRITICAL NEEDS:
${criticalNeeds.slice(0, 10).map(n => `- ${n.org_name}: ${n.quantity_needed} ${n.unit} of "${n.item_name}"`).join('\n') || 'None'}

SURPLUS ITEMS AVAILABLE:
${surplusList.map(i => `- ${i.org_name} has surplus: ${i.quantity} ${i.unit} of "${i.item_name}"`).join('\n') || 'None'}

Tasks:
1. Write a 3-sentence network health summary a coordinator can read in 10 seconds.
2. List up to 3 specific surplus-to-need redistribution opportunities (where a surplus item at one org matches a need at another).
3. List up to 3 organizations that need follow-up (stale data, critical shortages, or unusual patterns).
4. List up to 3 immediate action alerts.

Respond with valid JSON only — no markdown fences. Use this structure:
{
  "summary": "Three sentence summary here.",
  "redistribution_opportunities": [
    { "from_org": "...", "to_org": "...", "item": "...", "note": "..." }
  ],
  "follow_up_orgs": [
    { "org": "...", "reason": "..." }
  ],
  "alerts": [
    "Alert text here."
  ]
}`;

        const client = getClient();
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
        let parsed;
        try {
            const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            return res.status(500).json({ success: false, message: 'AI returned an unexpected response. Please try again.' });
        }

        res.json({ success: true, data: parsed });
    } catch (err) {
        console.error('AI network-insights error:', err.message);
        if (err.message.includes('ANTHROPIC_API_KEY')) {
            return res.status(503).json({ success: false, message: 'AI insights are not configured. Please set ANTHROPIC_API_KEY.' });
        }
        res.status(500).json({ success: false, message: 'Failed to generate insights. Please try again.' });
    }
});

module.exports = router;
