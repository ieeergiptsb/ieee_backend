import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please login.' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password -otp_code');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
};

// Admin email whitelist - Only these 3 emails can access admin panel
const ADMIN_EMAILS = [
  'bindalshashank.670@gmail.com',
  'ieee_sb@rgipt.ac.in',
  '24IT3056@rgipt.ac.in'
].map(email => email.toLowerCase().trim());

// Normalize email for Gmail (remove dots)
const normalizeEmail = (email) => {
  if (!email) return '';
  let normalized = email.toLowerCase().trim();
  if (normalized.includes('@gmail.com')) {
    const [localPart, domain] = normalized.split('@');
    normalized = localPart.replace(/\./g, '') + '@' + domain;
  }
  return normalized;
};

// Check if user email is in admin whitelist
export const requireAdminEmail = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please login.' 
      });
    }

    // Verify token
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(token);
    
    // Get user from database
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(decoded.userId).select('-password -otp_code');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if email is in whitelist
    const userEmail = normalizeEmail(user.email);
    const normalizedAdminEmails = ADMIN_EMAILS.map(normalizeEmail);
    
    if (!normalizedAdminEmails.includes(userEmail)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied. Admin access is restricted to authorized personnel only.' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;
    
    // Email is in whitelist, allow access
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};








