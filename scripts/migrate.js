/**
 * CommonGround Database Migration
 * Drops and recreates all tables for the donation coordination system.
 * Run: npm run migrate
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    let conn;
    try {
        const connConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true,
        };
        if (process.env.DB_SSL_ENABLED === 'true' || process.env.DB_SSL_ENABLED === '1') {
            let ca = process.env.DB_CA_CERT;
            if (!ca && process.env.DB_CA_CERT_PATH) {
                const certPath = path.resolve(process.cwd(), process.env.DB_CA_CERT_PATH);
                ca = fs.readFileSync(certPath, 'utf8');
            }
            connConfig.ssl = ca
                ? { ca, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
                : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
        }
        conn = await mysql.createConnection(connConfig);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        await conn.query(`USE \`${process.env.DB_NAME}\``);

        console.log('Running schema...');

        await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
        await conn.query(`DROP TABLE IF EXISTS chat_messages`);
        await conn.query(`DROP TABLE IF EXISTS chat_threads`);
        await conn.query(`DROP TABLE IF EXISTS surplus_requests`);
        await conn.query(`DROP TABLE IF EXISTS surplus_transfers`);
        await conn.query(`DROP TABLE IF EXISTS donations`);
        await conn.query(`DROP TABLE IF EXISTS needs`);
        await conn.query(`DROP TABLE IF EXISTS inventory_items`);
        await conn.query(`DROP TABLE IF EXISTS staff_members`);
        await conn.query(`DROP TABLE IF EXISTS organizations`);
        await conn.query(`DROP TABLE IF EXISTS admins`);
        await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

        await conn.query(`
            CREATE TABLE admins (
                id CHAR(36) PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('coordinator', 'super_admin') NOT NULL DEFAULT 'coordinator',
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await conn.query(`
            CREATE TABLE organizations (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category ENUM('shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach') NOT NULL,
                address VARCHAR(500),
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                website VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await conn.query(`
            CREATE TABLE staff_members (
                id CHAR(36) PRIMARY KEY,
                org_id CHAR(36) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE inventory_items (
                id CHAR(36) PRIMARY KEY,
                org_id CHAR(36) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                target_quantity INT NULL,
                unit VARCHAR(50) NOT NULL DEFAULT 'units',
                status ENUM('available', 'low', 'critical', 'surplus') NOT NULL DEFAULT 'available',
                expiry_date DATE NULL,
                notes TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE needs (
                id CHAR(36) PRIMARY KEY,
                org_id CHAR(36) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity_needed INT NOT NULL DEFAULT 1,
                unit VARCHAR(50) NOT NULL DEFAULT 'units',
                urgency ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
                notes TEXT,
                fulfilled TINYINT(1) NOT NULL DEFAULT 0,
                fulfilled_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE donations (
                id CHAR(36) PRIMARY KEY,
                donor_name VARCHAR(255) NOT NULL,
                donor_email VARCHAR(255) NOT NULL,
                donor_phone VARCHAR(50),
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit VARCHAR(50) NOT NULL DEFAULT 'units',
                \`condition\` ENUM('new', 'good', 'fair') NOT NULL DEFAULT 'good',
                preferred_org_id CHAR(36) NULL,
                matched_org_id CHAR(36) NULL,
                status ENUM('pending', 'matched', 'confirmed', 'delivered') NOT NULL DEFAULT 'pending',
                ai_match_reasoning TEXT,
                pickup_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (preferred_org_id) REFERENCES organizations(id) ON DELETE SET NULL,
                FOREIGN KEY (matched_org_id) REFERENCES organizations(id) ON DELETE SET NULL
            )
        `);

        await conn.query(`
            CREATE TABLE chat_threads (
                id CHAR(36) PRIMARY KEY,
                type ENUM('org_channel', 'direct') NOT NULL,
                org_id CHAR(36) NULL,
                staff_id CHAR(36) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE,
                CONSTRAINT chk_thread_type CHECK (
                    (type = 'org_channel' AND org_id IS NOT NULL AND staff_id IS NULL) OR
                    (type = 'direct' AND staff_id IS NOT NULL AND org_id IS NULL)
                )
            )
        `);

        await conn.query(`
            CREATE TABLE chat_messages (
                id CHAR(36) PRIMARY KEY,
                thread_id CHAR(36) NOT NULL,
                sender_type ENUM('coordinator', 'staff') NOT NULL,
                sender_id CHAR(36) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE surplus_requests (
                id CHAR(36) PRIMARY KEY,
                requesting_org_id CHAR(36) NOT NULL,
                from_org_id CHAR(36) NOT NULL,
                inventory_item_id CHAR(36) NOT NULL,
                quantity_requested INT NOT NULL DEFAULT 1,
                notes TEXT,
                status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP NULL,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (requesting_org_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (from_org_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
            )
        `);

        await conn.query(`
            CREATE TABLE surplus_transfers (
                id CHAR(36) PRIMARY KEY,
                from_org_id CHAR(36) NOT NULL,
                to_org_id CHAR(36) NOT NULL,
                inventory_item_id CHAR(36) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                status ENUM('pending', 'in_transit', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
                coordinator_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                FOREIGN KEY (from_org_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (to_org_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
            )
        `);

        console.log('Schema created. Seeding data...');

        const bcrypt = require('bcryptjs');
        const { randomUUID } = require('crypto');

        const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'coordinator@gmhsc.ca';
        const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123456';
        const adminHash = await bcrypt.hash(adminPass, 10);
        await conn.query(
            `INSERT INTO admins (id, first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
            [randomUUID(), 'Network', 'Coordinator', adminEmail, adminHash, 'coordinator']
        );
        console.log('  Admin created:', adminEmail);

        const orgs = [
            { name: 'Harvest House Atlantic', category: 'shelter_housing', address: '133 Duke St, Moncton, NB E1C 2W6', email: 'info@harvesthouse.ca', phone: '506-857-0012' },
            { name: 'Salvemos Wellness Centre', category: 'mental_health', address: '245 Main St, Moncton, NB E1C 1B8', email: 'info@salvemos.ca', phone: '506-382-7800' },
            { name: 'Crossroads for Women', category: 'shelter_housing', address: '100 Cameron St, Moncton, NB E1C 5Y6', email: 'info@crossroadsforwomen.ca', phone: '506-855-2400' },
            { name: 'Moncton Headstart Inc.', category: 'outreach', address: '245 Lutz St, Moncton, NB E1C 5G5', email: 'info@monctonheadstart.org', phone: '506-857-3277' },
            { name: 'GMHSC Network Hub', category: 'outreach', address: '95 Foundry St, Moncton, NB E1C 5H7', email: 'info@gmhsc.ca', phone: '506-877-3000' },
            { name: 'John Howard Society of SE New Brunswick', category: 'outreach', address: '77 King St, Moncton, NB E1C 1Z2', email: 'info@johnhoward.nb.ca', phone: '506-857-0088' },
            { name: 'Coverdale Centre for Women', category: 'shelter_housing', address: '55 Assomption Blvd, Moncton, NB E1C 1A3', email: 'info@coverdalecentre.ca', phone: '506-855-4349' },
            { name: 'Moncton Food Bank', category: 'food_nutrition', address: '21 Acadia St, Moncton, NB E1A 1L4', email: 'info@moncton-foodbank.ca', phone: '506-857-0124' },
            { name: 'Salvation Army Moncton', category: 'shelter_housing', address: '236 St George St, Moncton, NB E1C 1W1', email: 'moncton@salvationarmy.ca', phone: '506-857-2550' },
            { name: 'YWCA Moncton', category: 'shelter_housing', address: '35 Queen St, Moncton, NB E1C 1L2', email: 'info@ywcamoncton.ca', phone: '506-855-4349' },
            { name: 'Community Outreach Moncton', category: 'outreach', address: '140 Botsford St, Moncton, NB E1C 4X4', email: 'info@communityoutreach.ca', phone: '506-857-9100' },
            { name: 'YMCA Greater Moncton', category: 'goods_essentials', address: '30 War Veterans Ave, Moncton, NB E1C 8K7', email: 'info@ymcamoncton.ca', phone: '506-857-7930' },
            { name: 'Sognu Community Centre', category: 'goods_essentials', address: '55 Baig Blvd, Moncton, NB E1A 5T2', email: 'info@sognu.ca', phone: '506-859-7874' },
            { name: 'NB Association for Community Living', category: 'outreach', address: '440 Wilsey Rd, Fredericton, NB E3B 7G5', email: 'nbacl@nbacl.nb.ca', phone: '506-453-4400' },
            { name: 'Reconnect Mental Health Services', category: 'mental_health', address: '181 Main St, Moncton, NB E1C 1B7', email: 'info@reconnect.ca', phone: '506-858-8988' },
            { name: 'Horizon Health - Addictions', category: 'mental_health', address: '135 MacBeath Ave, Moncton, NB E1C 6Z8', email: 'addictions@horizonnb.ca', phone: '506-857-5800' },
            { name: 'Piedmont Wellness Centre', category: 'mental_health', address: '640 Main St, Moncton, NB E1C 1E4', email: 'info@piedmont.ca', phone: '506-857-2222' },
            { name: 'Open Sky Co-operative', category: 'goods_essentials', address: '30 Assomption Blvd, Moncton, NB E1C 1A3', email: 'info@opensky.ca', phone: '506-857-1480' },
            { name: 'Multicultural Association of Greater Moncton', category: 'outreach', address: '449 Paul St, Dieppe, NB E1A 4X5', email: 'info@magma.nb.ca', phone: '506-858-8747' },
            { name: 'Dobson Street Mission', category: 'food_nutrition', address: '60 Dobson St, Moncton, NB E1C 3C3', email: 'info@dobsonmission.ca', phone: '506-857-0222' },
            { name: 'St. Bernard Parish Outreach', category: 'food_nutrition', address: '45 St Bernard Ave, Dieppe, NB E1A 5M5', email: 'outreach@stbernard.ca', phone: '506-855-1212' },
            { name: 'Union Street Community Centre', category: 'goods_essentials', address: '175 Union St, Moncton, NB E1C 1N5', email: 'info@unionstreetcc.ca', phone: '506-858-5900' },
            { name: 'Maison Notre-Dame House', category: 'shelter_housing', address: '15 Weldon St, Moncton, NB E1C 5V8', email: 'info@maisondame.ca', phone: '506-382-0960' },
            { name: 'Kindred Works NB', category: 'goods_essentials', address: '300 Vaughan Harvey Blvd, Moncton, NB E1C 0M7', email: 'info@kindredworks.ca', phone: '506-855-0011' },
            { name: 'Muriel McQueen Fergusson Centre', category: 'outreach', address: '735 Main St, Moncton, NB E1C 1E6', email: 'info@mmfc.ca', phone: '506-363-8236' },
            { name: 'Greater Moncton Homeless Shelter', category: 'shelter_housing', address: '77 Connaught Ave, Moncton, NB E1C 6C7', email: 'shelter@gmhs.ca', phone: '506-858-8967' },
            { name: 'Community Food Centre Moncton', category: 'food_nutrition', address: '22 Fleet St, Moncton, NB E1C 4Y3', email: 'info@cfcmoncton.ca', phone: '506-857-3030' },
            { name: 'Reception House NB', category: 'shelter_housing', address: '245 Assomption Blvd, Moncton, NB E1C 1A7', email: 'info@receptionhousenb.ca', phone: '506-382-0040' },
        ];

        const orgIds = [];
        for (const org of orgs) {
            const id = randomUUID();
            orgIds.push(id);
            await conn.query(
                `INSERT INTO organizations (id, name, category, address, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, org.name, org.category, org.address, org.email, org.phone]
            );
        }
        console.log(`  ${orgs.length} organizations created`);

        const staffPassword = await bcrypt.hash('Staff123456', 10);
        const staffSeeds = [
            { first: 'Margaret', last: 'Leblanc', email: 'staff@harvesthouse.ca', orgIdx: 0 },
            { first: 'Sandra', last: 'Gallant', email: 'staff@crossroadsforwomen.ca', orgIdx: 2 },
            { first: 'Kevin', last: 'MacLeod', email: 'staff@johnhoward.nb.ca', orgIdx: 5 },
            { first: 'Denise', last: 'Bourque', email: 'staff@moncton-foodbank.ca', orgIdx: 7 },
            { first: 'Raymond', last: 'Cormier', email: 'staff@salvationarmy.ca', orgIdx: 8 },
            { first: 'Isabelle', last: 'Cyr', email: 'staff@gmhs.ca', orgIdx: 25 },
        ];
        for (const s of staffSeeds) {
            await conn.query(
                `INSERT INTO staff_members (id, org_id, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)`,
                [randomUUID(), orgIds[s.orgIdx], s.first, s.last, s.email, staffPassword]
            );
        }
        console.log(`  ${staffSeeds.length} staff members created`);

        for (const orgId of orgIds) {
            await conn.query(
                `INSERT INTO chat_threads (id, type, org_id) VALUES (?, 'org_channel', ?)`,
                [randomUUID(), orgId]
            );
        }
        console.log(`  ${orgIds.length} org chat channels created`);

        // idx: 0=Harvest House, 2=Crossroads, 7=Food Bank, 8=Salvation Army, 9=YWCA, 25=GMHS, 26=CFC, 22=Maison, 19=Dobson
        const inventoryData = [
            [orgIds[0], "Men's winter jackets", 'clothing', 12, 'items', 'available', null],
            [orgIds[0], 'Sleeping bags', 'bedding', 3, 'items', 'critical', null],
            [orgIds[0], 'Canned soup', 'food', 48, 'cans', 'surplus', '2026-12-01'],
            [orgIds[0], 'Toothbrushes', 'hygiene', 8, 'items', 'low', null],
            [orgIds[2], "Women's clothing (size M)", 'clothing', 25, 'items', 'available', null],
            [orgIds[2], 'Baby formula', 'food', 2, 'cans', 'critical', '2026-03-25'],
            [orgIds[2], 'Diapers (size 2)', 'baby_supplies', 30, 'packs', 'low', null],
            [orgIds[2], 'Shampoo', 'hygiene', 15, 'bottles', 'available', null],
            [orgIds[7], 'Pasta', 'food', 200, 'kg', 'surplus', '2026-06-01'],
            [orgIds[7], 'Canned vegetables', 'food', 350, 'cans', 'surplus', '2026-03-28'],
            [orgIds[7], 'Rice', 'food', 150, 'kg', 'available', '2026-08-01'],
            [orgIds[7], 'Cooking oil', 'food', 12, 'litres', 'low', '2026-03-20'],
            [orgIds[8], 'Blankets', 'bedding', 40, 'items', 'surplus', null],
            [orgIds[8], "Men's boots (size 9-11)", 'clothing', 6, 'pairs', 'available', null],
            [orgIds[8], 'Backpacks', 'goods', 18, 'items', 'available', null],
            [orgIds[8], 'Hand sanitizer', 'hygiene', 5, 'bottles', 'critical', null],
            [orgIds[9], 'Pillows', 'bedding', 10, 'items', 'low', null],
            [orgIds[9], 'Bed sheets (single)', 'bedding', 7, 'sets', 'low', null],
            [orgIds[25], 'Towels', 'bedding', 20, 'items', 'available', null],
            [orgIds[25], 'Bar soap', 'hygiene', 60, 'bars', 'surplus', null],
            [orgIds[25], "Men's socks", 'clothing', 4, 'pairs', 'critical', null],
            [orgIds[26], 'Bread loaves', 'food', 30, 'loaves', 'available', '2026-03-18'],
            [orgIds[26], 'Fresh vegetables', 'food', 45, 'kg', 'available', '2026-03-16'],
            [orgIds[19], 'Hot meal portions', 'food', 80, 'portions', 'available', null],
            [orgIds[19], 'Coffee', 'food', 3, 'kg', 'low', null],
            [orgIds[22], "Women's winter coats", 'clothing', 4, 'items', 'critical', null],
            [orgIds[22], "Children's clothing", 'clothing', 15, 'items', 'available', null],
        ];

        for (const row of inventoryData) {
            await conn.query(
                `INSERT INTO inventory_items (id, org_id, item_name, category, quantity, target_quantity, unit, status, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [randomUUID(), row[0], row[1], row[2], row[3], null, row[4], row[5], row[6]]
            );
        }
        console.log(`  ${inventoryData.length} inventory items created`);

        const needsData = [
            [orgIds[0], 'Sleeping bags', 'bedding', 20, 'items', 'critical', "Urgent — over capacity, men sleeping in the lounge."],
            [orgIds[0], "Men's underwear (L/XL)", 'clothing', 50, 'items', 'high', null],
            [orgIds[0], 'Steel-toed work boots (size 9-12)', 'clothing', 10, 'pairs', 'medium', 'For employment program participants.'],
            [orgIds[2], 'Baby formula (Enfamil/Similac)', 'food', 24, 'cans', 'critical', 'Three infants currently in residence.'],
            [orgIds[2], 'Diapers (sizes 1-3)', 'baby_supplies', 10, 'packs', 'high', null],
            [orgIds[2], "Children's winter jackets (age 3-10)", 'clothing', 8, 'items', 'high', 'Preparing for cold season.'],
            [orgIds[6], 'Feminine hygiene products', 'hygiene', 50, 'packs', 'critical', null],
            [orgIds[7], 'Cooking oil', 'food', 20, 'litres', 'medium', 'Running low for daily meal prep.'],
            [orgIds[8], 'Hand sanitizer', 'hygiene', 30, 'bottles', 'critical', 'Completely out — health inspection coming.'],
            [orgIds[8], 'Disposable gloves', 'hygiene', 10, 'boxes', 'high', null],
            [orgIds[9], 'Bed sheets (single)', 'bedding', 25, 'sets', 'high', 'Recent intake increase.'],
            [orgIds[9], 'Pillows', 'bedding', 20, 'items', 'medium', null],
            [orgIds[11], 'Sports equipment', 'goods', 15, 'items', 'low', 'For youth programming.'],
            [orgIds[16], 'Laundry detergent', 'hygiene', 20, 'bottles', 'high', null],
            [orgIds[19], 'Coffee', 'food', 10, 'kg', 'medium', 'Serving 80+ people daily.'],
            [orgIds[19], 'Sugar', 'food', 20, 'kg', 'medium', null],
            [orgIds[22], "Women's winter coats (size S-XL)", 'clothing', 15, 'items', 'critical', 'Currently have 4 — not enough for all residents.'],
            [orgIds[22], "Snow boots (women's, size 6-9)", 'clothing', 10, 'pairs', 'high', null],
            [orgIds[25], "Men's socks", 'clothing', 100, 'pairs', 'critical', 'Most requested item — always out.'],
            [orgIds[25], 'Toothpaste', 'hygiene', 50, 'tubes', 'high', null],
            [orgIds[25], 'Razors (disposable)', 'hygiene', 50, 'items', 'medium', null],
            [orgIds[26], 'Large cooking pots', 'goods', 3, 'items', 'medium', 'Old ones are worn out.'],
            [orgIds[27], 'Bed sheets', 'bedding', 30, 'sets', 'high', 'New intake wing opening next week.'],
            [orgIds[27], 'Towels', 'bedding', 40, 'items', 'high', null],
            [orgIds[3], 'Bus passes', 'goods', 20, 'items', 'high', 'For clients attending job interviews.'],
            [orgIds[5], 'Non-perishable food boxes', 'food', 100, 'boxes', 'high', 'For client support packages.'],
            [orgIds[17], 'Reusable grocery bags', 'goods', 30, 'items', 'low', null],
            [orgIds[14], 'Office supplies (pens, folders, paper)', 'goods', 5, 'boxes', 'low', null],
        ];

        for (const row of needsData) {
            await conn.query(
                `INSERT INTO needs (id, org_id, item_name, category, quantity_needed, unit, urgency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [randomUUID(), ...row]
            );
        }
        console.log(`  ${needsData.length} needs created`);

        const donationsData = [
            ['Robert Arsenault', 'r.arsenault@gmail.com', '506-555-0101', 'Sleeping bags', 'bedding', 5, 'items', 'good', null, orgIds[0], 'matched', "Strong match: Harvest House has a critical shortage of sleeping bags and is over capacity this week."],
            ['Linda Chiasson', 'linda.c@hotmail.com', null, 'Baby formula', 'food', 12, 'cans', 'new', orgIds[2], orgIds[2], 'confirmed', "Donor selected Crossroads for Women directly — aligns with their critical infant formula need."],
            ['Marc Boudreau', 'mboud@gmail.com', '506-555-0202', "Women's winter coats", 'clothing', 8, 'items', 'good', null, orgIds[22], 'matched', "Maison Notre-Dame has a critical shortage of women's winter coats with only 4 on hand."],
            ['Patricia Goguen', 'pgoguen@nbnet.nb.ca', null, 'Canned soup', 'food', 48, 'cans', 'new', null, null, 'pending', null],
            ['Tom Williams', 'twilliams@outlook.com', '506-555-0303', "Men's socks (assorted)", 'clothing', 60, 'pairs', 'new', null, orgIds[25], 'delivered', "Critical need at Greater Moncton Homeless Shelter — most requested item network-wide."],
            ['Annie Landry', 'annie.landry@gmail.com', null, 'Hand sanitizer', 'hygiene', 24, 'bottles', 'new', null, null, 'pending', null],
        ];

        for (const row of donationsData) {
            await conn.query(
                `INSERT INTO donations (id, donor_name, donor_email, donor_phone, item_name, category, quantity, unit, \`condition\`, preferred_org_id, matched_org_id, status, ai_match_reasoning) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [randomUUID(), ...row]
            );
        }
        console.log(`  ${donationsData.length} donations created`);

        // Get inventory item IDs for surplus items (blankets from Salvation Army, pasta/canned veg from Food Bank, bar soap from GMHS)
        const [invRows] = await conn.query(
            `SELECT id, org_id, item_name FROM inventory_items WHERE status = 'surplus' OR (status = 'low' AND item_name LIKE '%formula%') LIMIT 20`
        );
        const blanketsItem = invRows.find(r => r.item_name === 'Blankets');
        const pastaItem = invRows.find(r => r.item_name === 'Pasta');
        const cansItem = invRows.find(r => r.item_name === 'Canned vegetables');
        const soapItem = invRows.find(r => r.item_name === 'Bar soap');

        // Surplus request: Harvest House requesting blankets from Salvation Army (pending — coordinator to approve)
        if (blanketsItem) {
            await conn.query(
                `INSERT INTO surplus_requests (id, requesting_org_id, from_org_id, inventory_item_id, quantity_requested, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [randomUUID(), orgIds[0], orgIds[8], blanketsItem.id, 15, 'For men sleeping in the lounge — critical need this week.', 'pending']
            );
        }
        // Surplus request: YWCA requesting canned vegetables from Food Bank (approved)
        if (cansItem) {
            await conn.query(
                `INSERT INTO surplus_requests (id, requesting_org_id, from_org_id, inventory_item_id, quantity_requested, notes, status, responded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [randomUUID(), orgIds[9], orgIds[7], cansItem.id, 50, 'For our weekly communal dinner program.', 'approved']
            );
        }
        console.log('  Surplus requests created');

        // Surplus transfer: Coordinator moving pasta from Food Bank to John Howard Society (in_transit)
        if (pastaItem) {
            await conn.query(
                `INSERT INTO surplus_transfers (id, from_org_id, to_org_id, inventory_item_id, quantity, status, coordinator_notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [randomUUID(), orgIds[7], orgIds[5], pastaItem.id, 50, 'in_transit', 'Food Bank has 200kg surplus pasta. John Howard Society needs food boxes for client support packages.']
            );
        }
        // Surplus transfer: Bar soap from GMHS to Maison Notre-Dame (completed — shows network activity)
        if (soapItem) {
            await conn.query(
                `INSERT INTO surplus_transfers (id, from_org_id, to_org_id, inventory_item_id, quantity, status, coordinator_notes, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                [randomUUID(), orgIds[25], orgIds[22], soapItem.id, 20, 'completed', 'GMHS had 60-bar surplus. Maison needed hygiene supplies for new residents.', null]
            );
        }
        console.log('  Surplus transfers created');

        console.log('\nMigration complete.');
        console.log('  Coordinator login: ' + adminEmail + ' / ' + adminPass);
        console.log('  Staff logins:      staff@harvesthouse.ca / Staff123456 (and others)');
        console.log('  Visit:             http://localhost:' + (process.env.PORT || 3000) + '\n');

    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();
