import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import { generateToken } from '../utils/jwt.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email.js';
import { authenticate } from '../middleware/auth.js';
import { uploadProfilePicture } from '../middleware/upload.js';
import { isMemberEmail, getMemberDesignation } from '../utils/memberEmails.js';

const router = express.Router();

// Normalize email for comparison (handles Gmail dots)
const normalizeEmailForComparison = (email) => {
  if (!email) return '';
  let normalized = email.toLowerCase().trim();
  if (normalized.includes('@gmail.com')) {
    const [localPart, domain] = normalized.split('@');
    normalized = localPart.replace(/\./g, '') + '@' + domain;
  }
  return normalized;
};


// Validation middleware
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('full_name').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'), // Removed normalizeEmail() to preserve dots
  body('phone_number').trim().isLength({ min: 10 }).withMessage('Valid phone number is required'),
  body('college').trim().isLength({ min: 2 }).withMessage('College name is required'),
  body('branch').isIn(['CSE', 'CSD', 'IDD CSE', 'Electronics', 'EV', 'MnC', 'IT', 'Mechanical', 'Chemical', 'Petroleum', 'Civil', 'Biotech', 'Other']).withMessage('Valid branch is required'),
  body('year').isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']).withMessage('Valid year is required'),
  body('roll_no').trim().notEmpty().withMessage('Roll number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('membership_type').isIn(['ieee_member', 'non_member']).withMessage('Valid membership type is required'),
];

// Register - Initiate (Step 1: Create user and send OTP)
router.post('/register/initiate', uploadProfilePicture, registerValidation, async (req, res) => {
  try {
    // Handle multer errors
    if (req.fileValidationError) {
      return res.status(400).json({ 
        success: false, 
        error: req.fileValidationError 
      });
    }

    // Check if file size exceeded
    if (req.file && req.file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        error: 'Profile picture must be less than 1MB' 
      });
    }

    // Profile picture is mandatory
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Profile picture is required' 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    const { 
      username, 
      full_name, 
      email, 
      phone_number, 
      college, 
      branch, 
      year, 
      roll_no, 
      password, 
      membership_type, 
      membership_code,
      designation 
    } = req.body;

    // Handle profile picture upload (mandatory)
    // Convert buffer to base64 data URL
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const profileImageUrl = `data:${mimeType};base64,${base64Image}`;

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }
    
    // Check if user already exists (search with normalized email)
    const existingUser = await User.findOne({ 
      $or: [{ email: normalizedEmail }, { username }] 
    });

    if (existingUser) {
      if (existingUser.is_email_verified) {
        return res.status(400).json({ 
          success: false, 
          error: 'User already exists. Please login instead.' 
        });
      } else {
        // User exists but not verified (from old flow) - delete them to use PendingUser
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    // Auto-assign designation for authorized IEEE members based on email
    // Checks both email.json whitelist AND team-structure committee members
    let userDesignation = '';
    if (membership_type === 'ieee_member') {
      if (!isMemberEmail(normalizedEmail)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Only authorized IEEE member emails can register as IEEE members. Please contact admin for authorization or register as a non-member.' 
        });
      }
      userDesignation = getMemberDesignation(normalizedEmail) || 'Member';
    }
    
    // Create userData object to store in PendingUser
    const userData = {
      username,
      full_name,
      email: normalizedEmail,
      phone_number,
      college,
      branch,
      year,
      roll_no,
      password,
      membership_type,
      membership_code: membership_type === 'ieee_member' ? membership_code : null,
      designation: userDesignation,
      role: 'user',
      profile_image_url: profileImageUrl,
    };

    // Generate numeric 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in PendingUser collection
    await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, otp, userData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email using normalized email
    const emailResult = await sendOTPEmail(normalizedEmail, otp, 'registration');
    
    if (!emailResult.success) {
      console.error('⚠️ Failed to send OTP email:', emailResult.error);
      return res.json({ 
        success: true, 
        message: 'Registration initiated. OTP email failed to send. Please check console for OTP code.',
        email: normalizedEmail,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only in dev
      });
    }

    res.json({ 
      success: true, 
      message: 'Registration initiated. Please check your email for OTP code.',
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Registration failed. Please try again.' 
    });
  }
});

// Register - Complete (Step 2: Verify OTP)
router.post('/register/complete', async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    console.log('📥 OTP Verification Request:', { 
      email: email, 
      otp_code: otp_code,
      email_type: typeof email,
      email_length: email?.length
    });

    if (!email || !otp_code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and OTP code are required' 
      });
    }

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }
    
    const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

    if (!pendingUser) {
      // Check if already in User collection
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && existingUser.is_email_verified) {
        return res.status(400).json({ success: false, error: 'Email already verified. Please login.' });
      }
      return res.status(404).json({ success: false, error: 'Session expired or invalid email. Please register again.' });
    }

    if (pendingUser.otp !== otp_code) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
    }

    // OTP matches! Move from PendingUser to User
    const user = new User(pendingUser.userData);
    
    // Generate IEEE membership ID for IEEE members
    if (user.membership_type === 'ieee_member') {
      await user.generateIEEEMembershipID();
    }
    
    user.is_email_verified = true;
    await user.save();

    // Clean up PendingUser
    await PendingUser.deleteOne({ _id: pendingUser._id });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Registration completed successfully',
      access_token: token,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Verification failed. Please try again.' 
    });
  }
});

// Resend OTP
router.post('/otp/resend', async (req, res) => {
  try {
    const { email, otp_type = 'registration' } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }

    let otp;

    if (otp_type === 'registration') {
      const pendingUser = await PendingUser.findOne({ email: normalizedEmail });
      if (!pendingUser) {
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser && existingUser.is_email_verified) {
           return res.status(400).json({ success: false, error: 'Email already verified. Please login.' });
        }
        return res.status(404).json({ success: false, error: 'Registration session expired. Please register again.' });
      }
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      pendingUser.otp = otp;
      await pendingUser.save();
    } else {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      otp = user.generateOTP();
      await user.save();
    }

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, otp_type);

    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    res.json({ 
      success: true, 
      message: 'OTP resent successfully. Please check your email.' 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to resend OTP' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember_me = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }

    // Find user and include password for comparison (use normalized email)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      return res.status(401).json({ 
        success: false, 
        error: 'Email not verified. Please verify your email first.' 
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from user object
    const userObj = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      access_token: token,
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Login failed. Please try again.' 
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get user' 
    });
  }
});

// Refresh token
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      access_token: token,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to refresh token' 
    });
  }
});

// Forgot Password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, resetToken);

    if (!emailResult.success) {
      // Clear the reset token if email failed
      user.reset_token = null;
      user.reset_token_expires_at = null;
      await user.save();
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send password reset email. Please try again later.' 
      });
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process password reset request' 
    });
  }
});

// Reset Password - Verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, new_password } = req.body;

    if (!email || !token || !new_password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, token, and new password are required' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Normalize email: for Gmail, remove dots (Gmail treats dots as same)
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }

    // Find user with reset token
    const user = await User.findOne({ 
      email: normalizedEmail,
      reset_token: token 
    }).select('+password');

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    // Verify reset token
    if (!user.verifyResetToken(token)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    // Update password
    user.password = new_password;
    user.reset_token = null;
    user.reset_token_expires_at = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to reset password' 
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can add token blacklisting here if needed
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Logout failed' 
    });
  }
});

export default router;

