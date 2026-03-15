const { promisePool } = require('../config/database');
const { randomUUID } = require('crypto');

class OrganizationModel {
    static async findAll() {
        const [rows] = await promisePool.query(
            `SELECT * FROM organizations ORDER BY name ASC`
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.query(
            `SELECT * FROM organizations WHERE id = ? LIMIT 1`, [id]
        );
        return rows[0] || null;
    }

    // Returns each org with its top 3 unfulfilled needs, sorted by urgency
    static async findAllWithTopNeeds() {
        const [orgs] = await promisePool.query(`SELECT * FROM organizations ORDER BY name ASC`);
        const [needs] = await promisePool.query(
            `SELECT n.*,
                IFNULL(n.quantity_received, 0) AS quantity_received,
                (n.quantity_needed + IFNULL(n.quantity_received, 0)) AS quantity_original,
                CASE n.urgency WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END AS urgency_rank
             FROM needs n
             WHERE n.fulfilled = 0
             ORDER BY urgency_rank DESC, n.created_at ASC`
        );

        const needsByOrg = {};
        for (const n of needs) {
            if (!needsByOrg[n.org_id]) needsByOrg[n.org_id] = [];
            needsByOrg[n.org_id].push(n);
        }

        return orgs.map(org => ({
            ...org,
            top_needs: needsByOrg[org.id] || []
        }));
    }

    // For coordinator: orgs with critical need count and last inventory update
    static async findAllWithStats() {
        const [rows] = await promisePool.query(
            `SELECT o.*,
                COUNT(DISTINCT CASE WHEN n.urgency = 'critical' AND n.fulfilled = 0 THEN n.id END) AS critical_needs,
                COUNT(DISTINCT CASE WHEN n.fulfilled = 0 THEN n.id END) AS total_needs,
                COUNT(DISTINCT CASE WHEN i.status = 'surplus' THEN i.id END) AS surplus_items,
                MAX(i.updated_at) AS last_inventory_update
             FROM organizations o
             LEFT JOIN needs n ON n.org_id = o.id
             LEFT JOIN inventory_items i ON i.org_id = o.id
             GROUP BY o.id
             ORDER BY critical_needs DESC, o.name ASC`
        );
        return rows;
    }

    static async create(data) {
        const id = randomUUID();
        const { name, category, address, contact_email, contact_phone, website, notes } = data;
        if (!name || !category) {
            throw new Error('name and category are required');
        }
        const validCategories = ['shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach'];
        if (!validCategories.includes(category)) {
            throw new Error('Invalid category');
        }
        await promisePool.query(
            `INSERT INTO organizations (id, name, category, address, contact_email, contact_phone, website, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name.trim(), category, address?.trim() || null, contact_email?.trim() || null, contact_phone?.trim() || null, website?.trim() || null, notes?.trim() || null]
        );
        return this.findById(id);
    }

    static async update(id, data) {
        const allowed = ['name', 'category', 'address', 'contact_email', 'contact_phone', 'website', 'notes'];
        const set = [];
        const vals = [];
        for (const k of allowed) {
            if (data[k] !== undefined) {
                set.push(`${k} = ?`);
                vals.push(typeof data[k] === 'string' ? (data[k].trim() || null) : data[k]);
            }
        }
        if (data.category !== undefined) {
            const validCategories = ['shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach'];
            if (!validCategories.includes(data.category)) {
                throw new Error('Invalid category');
            }
        }
        if (set.length === 0) return this.findById(id);
        vals.push(id);
        await promisePool.query(`UPDATE organizations SET ${set.join(', ')} WHERE id = ?`, vals);
        return this.findById(id);
    }
}

module.exports = OrganizationModel;
