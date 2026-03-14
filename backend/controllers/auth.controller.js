const AdminModel = require('../models/admin.model');
const StaffModel = require('../models/staff.model');
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');

const cookieOpts = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 };

class AuthController {
    static async login(req, res) {
        try {
            const { email, password, role } = req.body;
            const normalizedEmail = (email || '').trim().toLowerCase();
            const normalizedPassword = (password || '').trim();

            if (!normalizedEmail || !normalizedPassword) {
                return res.status(400).json({ success: false, message: 'Email and password required' });
            }

            if (role === 'coordinator') {
                const admin = await AdminModel.findByEmailForLogin(normalizedEmail);
                if (!admin || admin.status !== 'active') {
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }
                const valid = await comparePassword(normalizedPassword, admin.password_hash);
                if (!valid) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }
                const payload = { id: admin.id, email: admin.email, role: 'coordinator', isAdmin: true };
                const accessToken = generateAccessToken(payload);
                const refreshToken = generateRefreshToken(payload);
                res.cookie('token', accessToken, cookieOpts);
                res.cookie('refreshToken', refreshToken, cookieOpts);
                return res.json({
                    success: true,
                    data: {
                        id: admin.id,
                        name: `${admin.first_name} ${admin.last_name}`,
                        email: admin.email,
                        role: 'coordinator',
                        isAdmin: true,
                        accessToken
                    }
                });
            }

            // Staff login
            const staff = await StaffModel.findByEmailForLogin(normalizedEmail);
            if (!staff || staff.status !== 'active') {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            const valid = await comparePassword(normalizedPassword, staff.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            const payload = { id: staff.id, email: staff.email, role: 'staff', orgId: staff.org_id, isAdmin: false };
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);
            res.cookie('token', accessToken, cookieOpts);
            res.cookie('refreshToken', refreshToken, cookieOpts);
            return res.json({
                success: true,
                data: {
                    id: staff.id,
                    name: `${staff.first_name} ${staff.last_name}`,
                    email: staff.email,
                    role: 'staff',
                    orgId: staff.org_id,
                    orgName: staff.org_name,
                    isAdmin: false,
                    accessToken
                }
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ success: false, message: 'Login failed' });
        }
    }

    static async logout(req, res) {
        res.clearCookie('token');
        res.clearCookie('refreshToken');
        res.json({ success: true });
    }

    static async me(req, res) {
        try {
            const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');
            if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

            const { verifyAccessToken } = require('../utils/jwt.util');
            const decoded = verifyAccessToken(token);
            if (!decoded) return res.status(401).json({ success: false, message: 'Invalid token' });

            if (decoded.role === 'coordinator') {
                const admin = await AdminModel.findById(decoded.id);
                if (!admin) return res.status(401).json({ success: false });
                return res.json({
                    success: true,
                    data: { id: admin.id, name: `${admin.first_name} ${admin.last_name}`, email: admin.email, role: 'coordinator', isAdmin: true }
                });
            }

            const staff = await StaffModel.findById(decoded.id);
            if (!staff) return res.status(401).json({ success: false });
            return res.json({
                success: true,
                data: { id: staff.id, name: `${staff.first_name} ${staff.last_name}`, email: staff.email, role: 'staff', orgId: staff.org_id, orgName: staff.org_name, isAdmin: false }
            });
        } catch (err) {
            res.status(401).json({ success: false });
        }
    }

    static async refresh(req, res) {
        try {
            const refreshToken = req.cookies?.refreshToken;
            if (!refreshToken) return res.status(401).json({ success: false });
            const decoded = verifyRefreshToken(refreshToken);
            const payload = { id: decoded.id, email: decoded.email, role: decoded.role, orgId: decoded.orgId, isAdmin: decoded.isAdmin };
            const accessToken = generateAccessToken(payload);
            res.cookie('token', accessToken, cookieOpts);
            res.json({ success: true, accessToken });
        } catch {
            res.clearCookie('token');
            res.clearCookie('refreshToken');
            res.status(401).json({ success: false });
        }
    }
}

module.exports = AuthController;
