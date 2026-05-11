import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

// ─── Core authenticate ─────────────────────────────────────────────────────
// Verifies the JWT and attaches req.userId + req.user (lean object, no password).
// Uses a lightweight lean() query — no Mongoose overhead.
export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login.',
      });
    }

    const decoded = verifyToken(token);
    req.userId = decoded.userId;

    // Lean query: returns a plain JS object (faster, no Mongoose overhead)
    const user = await User.findById(decoded.userId)
      .select('-password -otp_code -reset_token -otp_expires_at -reset_token_expires_at')
      .lean();

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

// ─── requireAdmin (role-based) ────────────────────────────────────────────
export const requireAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, error: 'Admin access required' });
};

// ─── Admin email whitelist ────────────────────────────────────────────────
const ADMIN_EMAILS_RAW = [
  'bindalshashank.670@gmail.com',
  'ieee_sb@rgipt.ac.in',
  '24IT3056@rgipt.ac.in',
];

// Normalize once at module load time (not on every request)
const normalizeEmail = (email) => {
  if (!email) return '';
  let n = email.toLowerCase().trim();
  if (n.includes('@gmail.com')) {
    const [local, domain] = n.split('@');
    n = local.replace(/\./g, '') + '@' + domain;
  }
  return n;
};

const ADMIN_EMAILS_NORMALIZED = new Set(ADMIN_EMAILS_RAW.map(normalizeEmail));

// ─── requireAdminEmail ────────────────────────────────────────────────────
// Must run AFTER authenticate (so req.user is already populated — NO extra DB hit).
export const requireAdminEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const userEmail = normalizeEmail(req.user.email);

  if (!ADMIN_EMAILS_NORMALIZED.has(userEmail)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin access is restricted to authorized personnel only.',
    });
  }

  next(); // req.user and req.userId already set by authenticate
};
