/**
 * API integration tests using supertest
 * Tests public endpoints that don't require DB mocking.
 * For DB-dependent routes we mock the models.
 */
const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';

const { sanitizeInput, blockSQLInjection, setSecurityHeaders } = require('../backend/middleware/security.middleware');
const { generateAccessToken } = require('../backend/utils/jwt.util');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(setSecurityHeaders);
    app.use(sanitizeInput);
    app.use(blockSQLInjection);
    return app;
}

describe('Health endpoint', () => {
    let app;

    beforeAll(() => {
        app = createApp();
        app.get('/api/health', (req, res) => {
            res.json({ success: true, app: 'CommonGround', timestamp: new Date().toISOString() });
        });
    });

    test('GET /api/health returns 200 with app name', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.app).toBe('CommonGround');
        expect(res.body.timestamp).toBeTruthy();
    });
});

describe('Security headers on responses', () => {
    let app;

    beforeAll(() => {
        app = createApp();
        app.get('/test', (req, res) => res.json({ ok: true }));
    });

    test('includes X-Content-Type-Options: nosniff', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('includes X-Frame-Options: DENY', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['x-frame-options']).toBe('DENY');
    });

    test('includes Referrer-Policy header', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    test('includes Permissions-Policy header', async () => {
        const res = await request(app).get('/test');
        expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    });
});

describe('SQL injection blocking on API routes', () => {
    let app;

    beforeAll(() => {
        app = createApp();
        app.post('/test', (req, res) => res.json({ received: req.body }));
        app.get('/test', (req, res) => res.json({ query: req.query }));
    });

    test('POST with SQL in body returns 400', async () => {
        const res = await request(app)
            .post('/test')
            .send({ name: "'; DROP TABLE users; --" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('GET with SQL in query returns 400', async () => {
        const res = await request(app)
            .get('/test')
            .query({ search: "UNION SELECT * FROM admins" });
        expect(res.status).toBe(400);
    });

    test('safe POST data passes through', async () => {
        const res = await request(app)
            .post('/test')
            .send({ name: 'John Doe', email: 'john@example.com' });
        expect(res.status).toBe(200);
        expect(res.body.received.name).toBe('John Doe');
    });
});

describe('Input sanitization on API', () => {
    let app;

    beforeAll(() => {
        app = createApp();
        app.post('/echo', (req, res) => res.json({ body: req.body }));
    });

    test('null bytes are stripped from POST data', async () => {
        const res = await request(app)
            .post('/echo')
            .send({ name: 'test\u0000inject' });
        expect(res.status).toBe(200);
        expect(res.body.body.name).toBe('testinject');
    });

    test('strings are trimmed', async () => {
        const res = await request(app)
            .post('/echo')
            .send({ name: '  padded  ' });
        expect(res.status).toBe(200);
        expect(res.body.body.name).toBe('padded');
    });
});

describe('Auth-protected route pattern', () => {
    let app;
    const { authenticateToken, requireAdmin } = require('../backend/middleware/auth.middleware');

    beforeAll(() => {
        app = createApp();

        app.get('/staff/data', authenticateToken, (req, res) => {
            res.json({ success: true, user: req.user });
        });

        app.get('/coordinator/data', authenticateToken, requireAdmin, (req, res) => {
            res.json({ success: true, user: req.user });
        });
    });

    test('unauthenticated request to staff route returns 401', async () => {
        const res = await request(app).get('/staff/data');
        expect(res.status).toBe(401);
    });

    test('authenticated staff can access staff route', async () => {
        const token = generateAccessToken({ id: 's1', email: 'staff@test.com', role: 'staff', isAdmin: false });
        const res = await request(app)
            .get('/staff/data')
            .set('Cookie', `token=${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.role).toBe('staff');
    });

    test('staff cannot access coordinator route', async () => {
        const token = generateAccessToken({ id: 's1', email: 'staff@test.com', role: 'staff', isAdmin: false });
        const res = await request(app)
            .get('/coordinator/data')
            .set('Cookie', `token=${token}`);
        expect(res.status).toBe(403);
    });

    test('coordinator can access coordinator route', async () => {
        const token = generateAccessToken({ id: 'a1', email: 'admin@test.com', role: 'coordinator', isAdmin: true });
        const res = await request(app)
            .get('/coordinator/data')
            .set('Cookie', `token=${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.isAdmin).toBe(true);
    });

    test('expired token returns 403', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 's2' }, process.env.JWT_SECRET, { expiresIn: '0s' });
        const res = await request(app)
            .get('/staff/data')
            .set('Cookie', `token=${token}`);
        expect(res.status).toBe(403);
    });

    test('Bearer header auth works', async () => {
        const token = generateAccessToken({ id: 's3', email: 'bearer@test.com', role: 'staff', isAdmin: false });
        const res = await request(app)
            .get('/staff/data')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});

describe('Donation matching API', () => {
    let app;

    beforeAll(() => {
        app = createApp();

        jest.mock('../backend/models/needs.model', () => ({
            findAllUnfulfilled: jest.fn().mockResolvedValue([
                { id: 'n1', org_id: 'o1', org_name: 'Harvest House', org_address: '123 Main', org_email: 'h@test.com', item_name: 'winter jackets', category: 'clothing', quantity_needed: 10, unit: 'items', urgency: 'critical' },
                { id: 'n2', org_id: 'o2', org_name: 'Salvus Clinic', org_address: '456 Oak', org_email: 's@test.com', item_name: 'blankets', category: 'bedding', quantity_needed: 20, unit: 'items', urgency: 'high' },
                { id: 'n3', org_id: 'o3', org_name: 'Food Depot', org_address: '789 Elm', org_email: 'f@test.com', item_name: 'canned soup', category: 'food', quantity_needed: 50, unit: 'cans', urgency: 'medium' },
            ]),
        }));

        const aiRoutes = require('../backend/routes/ai.routes');
        app.use('/api/ai', aiRoutes);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    test('POST /api/ai/match-donation returns matches for clothing', async () => {
        const res = await request(app)
            .post('/api/ai/match-donation')
            .send({ item_name: 'winter coats', category: 'clothing', quantity: 5 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.matches).toBeDefined();
        expect(res.body.data.matches.length).toBeGreaterThan(0);
        expect(res.body.data.matches[0].org_name).toBe('Harvest House');
    });

    test('POST /api/ai/match-donation requires item_name', async () => {
        const res = await request(app)
            .post('/api/ai/match-donation')
            .send({ category: 'clothing', quantity: 5 });
        expect(res.status).toBe(400);
    });

    test('POST /api/ai/match-donation requires category', async () => {
        const res = await request(app)
            .post('/api/ai/match-donation')
            .send({ item_name: 'coats', quantity: 5 });
        expect(res.status).toBe(400);
    });

    test('POST /api/ai/match-donation requires quantity', async () => {
        const res = await request(app)
            .post('/api/ai/match-donation')
            .send({ item_name: 'coats', category: 'clothing' });
        expect(res.status).toBe(400);
    });
});
