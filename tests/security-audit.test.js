/**
 * Security audit tests — validates the overall security posture of CommonGround.
 * Checks configuration, hardening, and best practices.
 */
const fs = require('fs');
const path = require('path');

describe('Authentication security', () => {
    test('JWT tokens use httpOnly cookies (not localStorage)', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).toContain('httpOnly: true');
    });

    test('cookies support SameSite attribute', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).toContain('sameSite:');
    });

    test('cookies support Secure flag for production', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).toContain('secure:');
        expect(authController).toContain('COOKIE_SECURE');
    });

    test('passwords are hashed with bcrypt (salt rounds >= 10)', () => {
        const hashUtil = fs.readFileSync(
            path.join(__dirname, '../backend/utils/hash.util.js'), 'utf8'
        );
        expect(hashUtil).toContain('bcrypt');
        expect(hashUtil).toContain('genSalt(10)');
    });

    test('login normalizes email to prevent case-bypass', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).toContain('.toLowerCase()');
    });

    test('login validates empty email/password', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).toContain("!normalizedEmail || !normalizedPassword");
    });

    test('invalid credentials return generic error (no user enumeration)', () => {
        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        const invalidMessages = authController.match(/Invalid credentials/g);
        expect(invalidMessages.length).toBeGreaterThanOrEqual(1);
        expect(authController).not.toContain('User not found');
        expect(authController).not.toContain('Password incorrect');
    });
});

describe('Rate limiting', () => {
    test('auth routes have dedicated rate limiter', () => {
        const authRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/auth.routes.js'), 'utf8'
        );
        expect(authRoutes).toContain('rateLimit');
        expect(authRoutes).toContain('authLimiter');
    });

    test('global rate limiter is configured', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('rateLimit');
        expect(server).toContain('RATE_LIMIT_WINDOW_MS');
        expect(server).toContain('RATE_LIMIT_MAX_REQUESTS');
    });

    test('AI matching has its own rate limiter', () => {
        const aiRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/ai.routes.js'), 'utf8'
        );
        expect(aiRoutes).toContain('matchLimiter');
    });
});

describe('Security headers and middleware', () => {
    test('Helmet is used for HTTP header hardening', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain("require('helmet')");
        expect(server).toContain('app.use(helmet(');
    });

    test('Content Security Policy is configured', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('contentSecurityPolicy');
        expect(server).toContain("defaultSrc: [\"'self'\"]");
    });

    test('CORS restricts origins in production', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('CORS_ORIGINS');
        expect(server).toContain("cb(new Error('Not allowed by CORS'))");
    });

    test('request body size is limited (prevents DoS)', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain("limit: '2mb'");
    });

    test('SQL injection middleware is applied globally', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('app.use(blockSQLInjection)');
    });

    test('input sanitization middleware is applied globally', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('app.use(sanitizeInput)');
    });
});

describe('Database security', () => {
    test('all models use parameterized queries (no string interpolation in SQL)', () => {
        const modelsDir = path.join(__dirname, '../backend/models');
        const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));
        expect(modelFiles.length).toBeGreaterThan(0);

        modelFiles.forEach(file => {
            const src = fs.readFileSync(path.join(modelsDir, file), 'utf8');
            const queries = src.match(/\.query\(/g);
            if (queries) {
                expect(src).toContain('?');
            }
        });
    });

    test('SSL is supported for database connections', () => {
        const dbConfig = fs.readFileSync(
            path.join(__dirname, '../backend/config/database.js'), 'utf8'
        );
        expect(dbConfig).toContain('DB_SSL_ENABLED');
        expect(dbConfig).toContain('ssl');
        expect(dbConfig).toContain('rejectUnauthorized');
    });

    test('connection pool has limits configured', () => {
        const dbConfig = fs.readFileSync(
            path.join(__dirname, '../backend/config/database.js'), 'utf8'
        );
        expect(dbConfig).toContain('connectionLimit');
        expect(dbConfig).toContain('waitForConnections');
    });
});

describe('Role-based access control', () => {
    test('staff routes require authentication', () => {
        const staffRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/staff.routes.js'), 'utf8'
        );
        expect(staffRoutes).toContain('authenticateToken');
    });

    test('coordinator routes require admin role', () => {
        const coordRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/coordinator.routes.js'), 'utf8'
        );
        expect(coordRoutes).toContain('authenticateToken');
        expect(coordRoutes).toContain('requireAdmin');
    });

    test('public routes do NOT require authentication', () => {
        const pubRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/public.routes.js'), 'utf8'
        );
        expect(pubRoutes).not.toContain('authenticateToken');
    });

    test('network insights require admin', () => {
        const aiRoutes = fs.readFileSync(
            path.join(__dirname, '../backend/routes/ai.routes.js'), 'utf8'
        );
        expect(aiRoutes).toContain('requireAdmin');
    });
});

describe('Error handling', () => {
    test('production error handler hides internal details', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain("process.env.NODE_ENV === 'production'");
        expect(server).toContain("'Internal server error'");
    });

    test('server has graceful shutdown handler', () => {
        const server = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(server).toContain('SIGTERM');
        expect(server).toContain('SIGINT');
        expect(server).toContain('pool.end()');
    });
});

describe('Environment security', () => {
    test('.env is in .gitignore', () => {
        const gitignore = fs.readFileSync(
            path.join(__dirname, '../.gitignore'), 'utf8'
        );
        expect(gitignore).toContain('.env');
    });

    test('no hardcoded secrets in source code', () => {
        const serverSrc = fs.readFileSync(
            path.join(__dirname, '../backend/server.js'), 'utf8'
        );
        expect(serverSrc).not.toMatch(/JWT_SECRET\s*=\s*['"][a-zA-Z0-9]{20,}/);

        const authController = fs.readFileSync(
            path.join(__dirname, '../backend/controllers/auth.controller.js'), 'utf8'
        );
        expect(authController).not.toMatch(/password\s*[:=]\s*['"][^'"\s]{8,}/);
    });
});
