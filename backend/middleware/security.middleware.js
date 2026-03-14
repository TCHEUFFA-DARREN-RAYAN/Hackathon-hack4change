const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/\0/g, '').replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim();
};

const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (typeof obj === 'number') return isNaN(obj) ? 0 : obj;
    if (typeof obj === 'boolean') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const out = {};
        for (const k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
            out[sanitizeString(k)] = sanitizeObject(obj[k]);
        }
        return out;
    }
    return obj;
};

const sanitizeInput = (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);
    next();
};

const blockSQLInjection = (req, res, next) => {
    const dangerous = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE)\b)|(--)|(\/\*)|(\*\/)/i;
    const check = (o) => {
        if (typeof o === 'string' && dangerous.test(o)) return true;
        if (Array.isArray(o)) return o.some(check);
        if (o && typeof o === 'object') return Object.values(o).some(check);
        return false;
    };
    if (check(req.body) || check(req.query) || check(req.params)) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    next();
};

const setSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};

module.exports = { sanitizeInput, blockSQLInjection, setSecurityHeaders };
