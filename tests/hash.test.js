/**
 * Password hashing utility tests
 */
const { hashPassword, comparePassword } = require('../backend/utils/hash.util');

describe('hashPassword', () => {
    test('produces a bcrypt hash', async () => {
        const hash = await hashPassword('mypassword');
        expect(hash).toBeTruthy();
        expect(hash).toMatch(/^\$2[aby]\$/);
        expect(hash.length).toBeGreaterThan(50);
    });

    test('produces different hashes for same input (salted)', async () => {
        const h1 = await hashPassword('same');
        const h2 = await hashPassword('same');
        expect(h1).not.toBe(h2);
    });
});

describe('comparePassword', () => {
    test('returns true for correct password', async () => {
        const hash = await hashPassword('correcthorse');
        const result = await comparePassword('correcthorse', hash);
        expect(result).toBe(true);
    });

    test('returns false for wrong password', async () => {
        const hash = await hashPassword('correcthorse');
        const result = await comparePassword('wrongpassword', hash);
        expect(result).toBe(false);
    });

    test('returns false for empty password', async () => {
        const hash = await hashPassword('secret');
        const result = await comparePassword('', hash);
        expect(result).toBe(false);
    });
});
