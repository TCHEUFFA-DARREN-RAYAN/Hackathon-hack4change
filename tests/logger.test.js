/**
 * Logger utility tests
 */

describe('Logger', () => {
    let logger;
    let consoleSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.resetModules();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('info() logs message in dev mode', () => {
        process.env.NODE_ENV = 'development';
        logger = require('../backend/utils/logger');
        logger.info('test message');
        expect(consoleSpy).toHaveBeenCalled();
        const output = consoleSpy.mock.calls[0].join(' ');
        expect(output).toContain('INFO:');
        expect(output).toContain('test message');
    });

    test('error() uses console.error', () => {
        process.env.NODE_ENV = 'development';
        logger = require('../backend/utils/logger');
        logger.error('error happened');
        expect(consoleErrorSpy).toHaveBeenCalled();
        const output = consoleErrorSpy.mock.calls[0].join(' ');
        expect(output).toContain('ERROR:');
    });

    test('info() outputs JSON in production', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        logger = require('../backend/utils/logger');
        logger.info('prod message');
        expect(consoleSpy).toHaveBeenCalled();
        const jsonStr = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(jsonStr);
        expect(parsed.level).toBe('info');
        expect(parsed.message).toBe('prod message');
        expect(parsed.timestamp).toBeTruthy();
    });

    test('includes metadata in log output', () => {
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        logger = require('../backend/utils/logger');
        logger.warn('warning', { code: 42 });
        const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(parsed.level).toBe('warn');
        expect(parsed.code).toBe(42);
    });
});
