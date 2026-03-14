/**
 * Database configuration & migration tests
 */
const fs = require('fs');
const path = require('path');

describe('Database configuration', () => {
    test('database.js exports pool, promisePool, and testConnection', () => {
        jest.resetModules();
        jest.mock('mysql2', () => ({
            createPool: jest.fn(() => ({
                promise: () => ({
                    query: jest.fn(),
                    getConnection: jest.fn().mockResolvedValue({ release: jest.fn() }),
                }),
                end: jest.fn(),
            })),
        }));

        const db = require('../backend/config/database');
        expect(db.pool).toBeDefined();
        expect(db.promisePool).toBeDefined();
        expect(typeof db.testConnection).toBe('function');
    });
});

describe('Migration script', () => {
    const migratePath = path.join(__dirname, '../scripts/migrate.js');

    test('migrate.js exists', () => {
        expect(fs.existsSync(migratePath)).toBe(true);
    });

    test('migrate.js contains all required table creation statements', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        const requiredTables = [
            'admins',
            'organizations',
            'staff_members',
            'inventory_items',
            'needs',
            'donations',
            'chat_threads',
            'chat_messages',
            'surplus_requests',
            'surplus_transfers',
        ];
        requiredTables.forEach(table => {
            expect(src).toContain(`CREATE TABLE ${table}`);
        });
    });

    test('migrate.js seeds initial data', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain('INSERT INTO admins');
        expect(src).toContain('INSERT INTO organizations');
        expect(src).toContain('INSERT INTO staff_members');
    });

    test('admins table has password_hash column', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain('password_hash');
    });

    test('organizations table has category enum', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain("ENUM('shelter_housing', 'food_nutrition', 'goods_essentials', 'mental_health', 'outreach')");
    });

    test('needs table has urgency enum', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain("ENUM('low', 'medium', 'high', 'critical')");
    });

    test('donations table has status tracking', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain("ENUM('pending', 'matched', 'confirmed', 'delivered')");
    });

    test('surplus_transfers table tracks transfer lifecycle', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        expect(src).toContain('from_org_id');
        expect(src).toContain('to_org_id');
    });

    test('all tables use CHAR(36) primary keys (UUIDs)', () => {
        const src = fs.readFileSync(migratePath, 'utf8');
        const tableNames = src.match(/CREATE TABLE (\w+)/g);
        expect(tableNames).toBeTruthy();
        expect(tableNames.length).toBeGreaterThanOrEqual(10);
        const pkMatches = (src.match(/id CHAR\(36\) PRIMARY KEY/g) || []).length;
        expect(pkMatches).toBe(tableNames.length);
    });
});

describe('Environment variables for DB', () => {
    test('.env file exists', () => {
        const envPath = path.join(__dirname, '../.env');
        expect(fs.existsSync(envPath)).toBe(true);
    });

    test('.env contains required DB config keys', () => {
        const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
        expect(envContent).toContain('DB_HOST');
        expect(envContent).toContain('DB_USER');
        expect(envContent).toContain('DB_PASSWORD');
        expect(envContent).toContain('DB_NAME');
    });

    test('.env contains JWT_SECRET', () => {
        const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
        expect(envContent).toContain('JWT_SECRET');
    });
});
