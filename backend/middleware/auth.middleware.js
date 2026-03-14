const { verifyAccessToken } = require('../utils/jwt.util');

const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ success: false, message: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
