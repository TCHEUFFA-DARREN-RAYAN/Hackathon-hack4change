const { promisePool } = require('../config/database');

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
                CASE n.urgency WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END AS urgency_rank
             FROM needs n
             WHERE n.fulfilled = 0
             ORDER BY urgency_rank DESC, n.created_at ASC`
        );

        const needsByOrg = {};
        for (const n of needs) {
            if (!needsByOrg[n.org_id]) needsByOrg[n.org_id] = [];
            if (needsByOrg[n.org_id].length < 3) needsByOrg[n.org_id].push(n);
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
}

module.exports = OrganizationModel;
