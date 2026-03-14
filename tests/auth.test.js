/**
 * Auth middleware & JWT utility tests
 */
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../backend/utils/jwt.util');
const { authenticateToken, requireAdmin } = require('../backend/middleware/auth.middleware');

function mockReqResNext(cookies = {}, headers = {}) {
    const req = { cookies, headers, body: {} };
    const res = {
        statusCode: 200,
        data: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
    };
    let called = false;
    const next = () => { called = true; };
    return { req, res, next, wasCalled: () => called };
}

describe('JWT utility', () => {
    const payload = { id: 'user-123', email: 'test@test.com', role: 'staff', isAdmin: false };

    test('generateAccessToken creates a valid JWT', () => {
        const token = generateAccessToken(payload);
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
    });

    test('verifyAccessToken returns decoded payload for valid token', () => {
        const token = generateAccessToken(payload);
        const decoded = verifyAccessToken(token);
        expect(decoded).toBeTruthy();
        expect(decoded.id).toBe('user-123');
        expect(decoded.email).toBe('test@test.com');
        expect(decoded.role).toBe('staff');
    });

    test('verifyAccessToken returns null for invalid token', () => {
        const decoded = verifyAccessToken('invalid-token');
        expect(decoded).toBeNull();
    });

    test('verifyAccessToken returns null for expired token', () => {
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '0s' });
        const decoded = verifyAccessToken(token);
        expect(decoded).toBeNull();
    });

    test('verifyAccessToken returns null for wrong secret', () => {
        const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });
        const decoded = verifyAccessToken(token);
        expect(decoded).toBeNull();
    });

    test('generateRefreshToken creates a valid JWT', () => {
        const token = generateRefreshToken(payload);
        expect(token).toBeTruthy();
        const decoded = verifyRefreshToken(token);
        expect(decoded.id).toBe('user-123');
    });

    test('verifyRefreshToken throws for invalid token', () => {
        expect(() => verifyRefreshToken('invalid')).toThrow();
    });

    test('token contains correct role claims', () => {
        const adminPayload = { id: 'admin-1', email: 'admin@test.com', role: 'coordinator', isAdmin: true };
        const token = generateAccessToken(adminPayload);
        const decoded = verifyAccessToken(token);
        expect(decoded.role).toBe('coordinator');
        expect(decoded.isAdmin).toBe(true);
    });
});

describe('authenticateToken middleware', () => {
    test('rejects request with no token', async () => {
        const m = mockReqResNext({}, {});
        await authenticateToken(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(401);
        expect(m.res.data.message).toBe('Access token required');
    });

    test('accepts valid cookie token and populates req.user', async () => {
        const payload = { id: 'u1', email: 'test@test.com', role: 'staff', isAdmin: false };
        const token = generateAccessToken(payload);
        const m = mockReqResNext({ token }, {});
        await authenticateToken(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
        expect(m.req.user.id).toBe('u1');
        expect(m.req.user.role).toBe('staff');
    });

    test('accepts valid Bearer header token', async () => {
        const payload = { id: 'u2', email: 'admin@test.com', role: 'coordinator', isAdmin: true };
        const token = generateAccessToken(payload);
        const m = mockReqResNext({}, { authorization: `Bearer ${token}` });
        await authenticateToken(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
        expect(m.req.user.isAdmin).toBe(true);
    });

    test('rejects expired token', async () => {
        const token = jwt.sign({ id: 'u3' }, process.env.JWT_SECRET, { expiresIn: '0s' });
        const m = mockReqResNext({ token }, {});
        await authenticateToken(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(403);
    });

    test('rejects tampered token', async () => {
        const token = generateAccessToken({ id: 'u4' });
        const tampered = token.slice(0, -5) + 'XXXXX';
        const m = mockReqResNext({ token: tampered }, {});
        await authenticateToken(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(403);
    });
});

describe('requireAdmin middleware', () => {
    test('allows admin user', () => {
        const m = mockReqResNext();
        m.req.user = { id: 'a1', isAdmin: true };
        requireAdmin(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
    });

    test('blocks non-admin user', () => {
        const m = mockReqResNext();
        m.req.user = { id: 's1', isAdmin: false };
        requireAdmin(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(403);
        expect(m.res.data.message).toBe('Admin access required');
    });

    test('blocks request with no user', () => {
        const m = mockReqResNext();
        m.req.user = null;
        requireAdmin(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(403);
    });
});
