const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testConnection, pool, promisePool } = require('./config/database');
const logger = require('./utils/logger');
const { sanitizeInput, blockSQLInjection, setSecurityHeaders } = require('./middleware/security.middleware');

const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const staffRoutes = require('./routes/staff.routes');
const coordinatorRoutes = require('./routes/coordinator.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            mediaSrc: ["'self'", 'https://videos.pexels.com'],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com']
        }
    },
    crossOriginEmbedderPolicy: false
}));

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
allowedOrigins.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        if (process.env.NODE_ENV === 'development') return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'commonground-dev-secret'));

// Skip rate limiting in development to avoid blocking refreshes; set DISABLE_RATE_LIMIT=1 to disable in any env
const rateLimitDisabled = process.env.DISABLE_RATE_LIMIT === '1' || process.env.NODE_ENV !== 'production';
if (!rateLimitDisabled) {
    app.use(rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
        message: { success: false, message: 'Too many requests' }
    }));
}

app.use(setSecurityHeaders);
app.use(sanitizeInput);
app.use(blockSQLInjection);

// API routes
app.get('/api/health', async (req, res) => {
    const basic = { success: true, app: 'CommonGround', timestamp: new Date().toISOString() };
    if (req.query.deep === 'true' || req.query.deep === '1') {
        try {
            const conn = await promisePool.getConnection();
            conn.release();
            res.json({ ...basic, db: 'ok' });
        } catch (err) {
            logger.error('Health check DB ping failed', { error: err.message });
            res.status(503).json({ ...basic, db: 'error' });
        }
    } else {
        res.json(basic);
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/ai', aiRoutes);

// Static files and page routes
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, { index: false }));

// Redirect legacy admin/auth routes to coordinator login
app.get('/admin', (req, res) => res.redirect(302, '/coordinator'));
app.get('/admin/*', (req, res) => res.redirect(302, '/coordinator'));
app.get('/auth', (req, res) => res.sendFile(path.join(publicPath, 'auth.html')));

const pages = {
    '/': 'index.html',
    '/all-needs': 'all-needs.html',
    '/give': 'give.html',
    '/donate': 'donate.html',
    '/staff': 'staff.html',
    '/coordinator': 'coordinator.html',
    '/login': 'auth.html'
};

for (const [route, file] of Object.entries(pages)) {
    app.get(route, (req, res) => res.sendFile(path.join(publicPath, file)));
}

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(404).sendFile(path.join(publicPath, 'index.html'));
});

app.use((err, req, res, next) => {
    logger.error(err.message || 'Server error', { stack: err.stack });
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Server error');
    res.status(500).json({ success: false, message });
});

const start = async () => {
    const ok = await testConnection();
    if (!ok) {
        logger.error('Database connection failed. Run: npm run migrate');
        process.exit(1);
    }

    // Ensure quantity_received column exists (safe to run repeatedly)
    try {
        await promisePool.query('ALTER TABLE needs ADD COLUMN quantity_received INT NOT NULL DEFAULT 0');
        logger.info('Added quantity_received column to needs table');
    } catch (_) { /* column already exists — safe to ignore */ }

    const http = require('http');
    const { Server: SocketIO } = require('socket.io');
    const httpServer = http.createServer(app);
    const io = new SocketIO(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
            credentials: true
        }
    });
    app.set('io', io);

    io.on('connection', (socket) => {
        logger.info('Socket.IO client connected', { id: socket.id });
        socket.on('disconnect', () => {
            logger.info('Socket.IO client disconnected', { id: socket.id });
        });
    });

    const server = httpServer.listen(PORT, process.env.HOST || '0.0.0.0', () => {
        console.log(`CommonGround running at http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        server.close(async () => {
            try {
                await pool.end();
                logger.info('Database pool closed');
            } catch (err) {
                logger.error('Error closing pool', { error: err.message });
            }
            process.exit(0);
        });
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch(err => {
    logger.error(err.message || 'Startup failed', { stack: err.stack });
    process.exit(1);
});
