/**
 * Security middleware tests
 */
const { sanitizeInput, blockSQLInjection, setSecurityHeaders } = require('../backend/middleware/security.middleware');

function mockReqResNext(body = {}, query = {}, params = {}) {
    const req = { body, query, params };
    const res = {
        statusCode: 200,
        headers: {},
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
        setHeader(k, v) { this.headers[k] = v; },
    };
    let called = false;
    const next = () => { called = true; };
    return { req, res, next, wasCalled: () => called };
}

describe('sanitizeInput middleware', () => {
    test('strips null bytes from strings', () => {
        const { req, res, next } = mockReqResNext({ name: 'test\0injection' });
        sanitizeInput(req, res, next);
        expect(req.body.name).toBe('testinjection');
    });

    test('strips control characters', () => {
        const { req, res, next } = mockReqResNext({ name: 'hello\x07world' });
        sanitizeInput(req, res, next);
        expect(req.body.name).toBe('helloworld');
    });

    test('trims whitespace from strings', () => {
        const { req, res, next } = mockReqResNext({ name: '  padded  ' });
        sanitizeInput(req, res, next);
        expect(req.body.name).toBe('padded');
    });

    test('preserves numbers, booleans, and null', () => {
        const { req, res, next } = mockReqResNext({ count: 42, active: true, data: null });
        sanitizeInput(req, res, next);
        expect(req.body.count).toBe(42);
        expect(req.body.active).toBe(true);
        expect(req.body.data).toBeNull();
    });

    test('converts NaN to 0', () => {
        const { req, res, next } = mockReqResNext({ val: NaN });
        sanitizeInput(req, res, next);
        expect(req.body.val).toBe(0);
    });

    test('sanitizes nested objects', () => {
        const { req, res, next } = mockReqResNext({ user: { name: 'test\0' } });
        sanitizeInput(req, res, next);
        expect(req.body.user.name).toBe('test');
    });

    test('sanitizes arrays', () => {
        const { req, res, next } = mockReqResNext({ items: ['ok\0', 'fine\x01'] });
        sanitizeInput(req, res, next);
        expect(req.body.items).toEqual(['ok', 'fine']);
    });

    test('sanitizes query and params', () => {
        const { req, res, next } = mockReqResNext(
            {},
            { search: 'term\0' },
            { id: 'abc\x07' }
        );
        sanitizeInput(req, res, next);
        expect(req.query.search).toBe('term');
        expect(req.params.id).toBe('abc');
    });

    test('calls next()', () => {
        const m = mockReqResNext({ safe: 'data' });
        sanitizeInput(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
    });
});

describe('blockSQLInjection middleware', () => {
    test('blocks SELECT injection in body', () => {
        const m = mockReqResNext({ name: "'; SELECT * FROM users --" });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(400);
        expect(m.res.data.success).toBe(false);
    });

    test('blocks DROP TABLE in body', () => {
        const m = mockReqResNext({ x: 'DROP TABLE admins' });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
        expect(m.res.statusCode).toBe(400);
    });

    test('blocks UNION injection in query', () => {
        const m = mockReqResNext({}, { search: "' UNION SELECT password FROM admins" });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
    });

    test('blocks SQL comments (--)', () => {
        const m = mockReqResNext({ val: "admin'--" });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
    });

    test('blocks block comments (/* */)', () => {
        const m = mockReqResNext({ val: '/* bypass */' });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
    });

    test('allows safe input', () => {
        const m = mockReqResNext({ name: 'John Doe', email: 'john@example.com' });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
    });

    test('allows normal sentences without SQL keywords', () => {
        const m = mockReqResNext({ notes: 'Please deliver items to the shelter' });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
    });

    test('blocks nested object SQL injection', () => {
        const m = mockReqResNext({ user: { name: "'; DELETE FROM users; --" } });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
    });

    test('blocks SQL in arrays', () => {
        const m = mockReqResNext({ ids: ['safe', "'; INSERT INTO admins VALUES(1)"] });
        blockSQLInjection(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(false);
    });
});

describe('setSecurityHeaders middleware', () => {
    test('sets X-Content-Type-Options to nosniff', () => {
        const m = mockReqResNext();
        setSecurityHeaders(m.req, m.res, m.next);
        expect(m.res.headers['X-Content-Type-Options']).toBe('nosniff');
    });

    test('sets X-Frame-Options to DENY', () => {
        const m = mockReqResNext();
        setSecurityHeaders(m.req, m.res, m.next);
        expect(m.res.headers['X-Frame-Options']).toBe('DENY');
    });

    test('sets Referrer-Policy header', () => {
        const m = mockReqResNext();
        setSecurityHeaders(m.req, m.res, m.next);
        expect(m.res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    test('sets Permissions-Policy header', () => {
        const m = mockReqResNext();
        setSecurityHeaders(m.req, m.res, m.next);
        expect(m.res.headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    });

    test('calls next()', () => {
        const m = mockReqResNext();
        setSecurityHeaders(m.req, m.res, m.next);
        expect(m.wasCalled()).toBe(true);
    });
});
