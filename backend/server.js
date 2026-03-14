const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testConnection } = require('./config/database');
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
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com']
        }
    },
    crossOriginEmbedderPolicy: false
}));

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
allowedOrigins.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'commonground-dev-secret'));

app.use(rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
    message: { success: false, message: 'Too many requests' }
}));

app.use(setSecurityHeaders);
app.use(sanitizeInput);
app.use(blockSQLInjection);

// API routes
app.get('/api/health', (req, res) => {
    res.json({ success: true, app: 'CommonGround', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/ai', aiRoutes);

// Static files and page routes
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, { index: false }));

const pages = {
    '/': 'index.html',
    '/donate': 'donate.html',
    '/staff': 'staff.html',
    '/coordinator': 'coordinator.html',
    '/login': 'login.html'
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
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
});

const start = async () => {
    const ok = await testConnection();
    if (!ok) {
        console.error('Database connection failed. Run: npm run migrate');
        process.exit(1);
    }
    app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
        console.log(`CommonGround running at http://localhost:${PORT}`);
    });
};

start().catch(err => {
    console.error(err);
    process.exit(1);
});
