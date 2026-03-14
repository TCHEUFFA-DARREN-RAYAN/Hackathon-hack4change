const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/auth.controller');

const authLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 15,
    message: { success: false, message: 'Too many attempts' }
});

router.post('/login', authLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.me);
router.post('/refresh', AuthController.refresh);

module.exports = router;
