import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email.js';
import { authenticate } from '../middleware/auth.js';
import { uploadProfilePicture } from '../middleware/upload.js';

const router = express.Router();

// Authorized emails for IEEE member registration with their designations
const AUTHORIZED_IEEE_MEMBER_EMAILS = {
  '24it3056@rgipt.ac.in': 'CS_Cohead',
  // Add more authorized emails here as needed
  // Format: 'email@domain.com': 'Designation'
};

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
  body('branch').isIn(['CSE', 'CSD', 'ECE', 'EV', 'MnC', 'IT', 'Mechanical', 'Chemical', 'Petroleum', 'Civil', 'Biotech', 'Other']).withMessage('Valid branch is required'),
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
      membership_code 
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
        // User exists but not verified - update and resend OTP
        existingUser.full_name = full_name;
        existingUser.phone_number = phone_number;
        existingUser.college = college;
        existingUser.branch = branch;
        existingUser.year = year;
        existingUser.roll_no = roll_no;
        existingUser.password = password;
        // Validate IEEE member registration for existing users too
        if (membership_type === 'ieee_member') {
          const normalizedForCheck = normalizeEmailForComparison(normalizedEmail);
          const authorizedEmail = Object.keys(AUTHORIZED_IEEE_MEMBER_EMAILS).find(
            authEmail => normalizeEmailForComparison(authEmail) === normalizedForCheck
          );
          
          if (!authorizedEmail) {
            return res.status(403).json({ 
              success: false, 
              error: 'Only authorized emails can register as IEEE members. Please contact admin for authorization or register as a non-member.' 
            });
          }
          
          // Set designation for authorized IEEE members
          existingUser.designation = AUTHORIZED_IEEE_MEMBER_EMAILS[authorizedEmail];
        }
        
        existingUser.membership_type = membership_type;
        existingUser.membership_code = membership_type === 'ieee_member' ? membership_code : null;
        
        // Generate IEEE membership ID for IEEE members if they don't have one
        if (membership_type === 'ieee_member' && !existingUser.ieee_membership_id) {
          await existingUser.generateIEEEMembershipID();
        }
        
        if (profileImageUrl) {
          existingUser.profile_image_url = profileImageUrl;
        }
        
        const otp = existingUser.generateOTP();
        await existingUser.save();

        // Reuse normalizedEmail from above (already declared)
        // For Gmail, remove dots if not already done
        if (normalizedEmail.includes('@gmail.com') && normalizedEmail.includes('.')) {
          const [localPart, domain] = normalizedEmail.split('@');
          normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
        }
        
        // Send OTP email
        await sendOTPEmail(normalizedEmail, otp, 'registration');

        return res.json({ 
          success: true, 
          message: 'OTP sent to your email. Please verify to complete registration.',
          email: normalizedEmail
        });
      }
    }

    // Note: IEEE membership ID will be auto-generated on the backend
    // membership_code is optional (only for users who already have an existing code)

    // normalizedEmail already declared above, just ensure Gmail dots are removed
    if (normalizedEmail.includes('@gmail.com') && normalizedEmail.includes('.')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }
    
    // Validate IEEE member registration - check if email is authorized
    if (membership_type === 'ieee_member') {
      const normalizedForCheck = normalizeEmailForComparison(normalizedEmail);
      const authorizedEmail = Object.keys(AUTHORIZED_IEEE_MEMBER_EMAILS).find(
        authEmail => normalizeEmailForComparison(authEmail) === normalizedForCheck
      );
      
      if (!authorizedEmail) {
        return res.status(403).json({ 
          success: false, 
          error: 'Only authorized emails can register as IEEE members. Please contact admin for authorization or register as a non-member.' 
        });
      }
    }
    
    // Get designation for authorized IEEE members
    let userDesignation = '';
    if (membership_type === 'ieee_member') {
      const normalizedForCheck = normalizeEmailForComparison(normalizedEmail);
      const authorizedEmail = Object.keys(AUTHORIZED_IEEE_MEMBER_EMAILS).find(
        authEmail => normalizeEmailForComparison(authEmail) === normalizedForCheck
      );
      if (authorizedEmail) {
        userDesignation = AUTHORIZED_IEEE_MEMBER_EMAILS[authorizedEmail];
      }
    }
    
    // Create new user
    const user = new User({
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
      designation: userDesignation, // Set designation for authorized IEEE members
      role: 'user',
      profile_image_url: profileImageUrl,
    });

    // Generate IEEE membership ID for IEEE members
    if (membership_type === 'ieee_member') {
      await user.generateIEEEMembershipID();
    }

    // Generate and save OTP
    const otp = user.generateOTP();
    await user.save();

    // Verify user was saved by fetching it again
    const savedUser = await User.findById(user._id);
    console.log('✅ User created and saved:', { 
      id: user._id, 
      email: user.email, 
      saved_email: savedUser?.email,
      username: user.username,
      otp: otp,
      email_normalized: normalizedEmail,
      is_saved: !!savedUser
    });
    
    if (!savedUser) {
      console.error('❌ ERROR: User was not saved to database!');
      return res.status(500).json({
        success: false,
        error: 'Failed to save user. Please try again.'
      });
    }

    // Send OTP email using normalized email
    const emailResult = await sendOTPEmail(normalizedEmail, otp, 'registration');
    
    if (!emailResult.success) {
      console.error('⚠️ Failed to send OTP email:', emailResult.error);
      // Still return success but include OTP in response for development
      // In production, you might want to handle this differently
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
    
    console.log('🔍 Looking for user with normalized email:', normalizedEmail);
    
    // First, check all users in database for debugging
    const allUsersBefore = await User.find({}, 'email username is_email_verified');
    console.log('📋 All users in database BEFORE search:', allUsersBefore.map(u => ({ 
      email: u.email, 
      username: u.username,
      verified: u.is_email_verified,
      email_exact_match: u.email === normalizedEmail,
      email_length: u.email?.length,
      search_length: normalizedEmail.length
    })));
    
    // Try exact match first
    let user = await User.findOne({ email: normalizedEmail });
    
    // If not found and it's Gmail, also try with dots (in case stored differently)
    if (!user && normalizedEmail.includes('@gmail.com')) {
      console.log('⚠️ Exact match not found, trying with dots...');
      const emailWithDots = normalizedEmail.replace(/([a-z0-9])/g, '$1.').replace(/\.@/g, '@');
      // Try a few common dot patterns
      const variations = [
        normalizedEmail.replace(/([a-z0-9])([a-z0-9])/g, '$1.$2'),
        normalizedEmail.replace(/([a-z0-9]{3})/g, '$1.')
      ];
      for (const variation of variations) {
        user = await User.findOne({ email: variation });
        if (user) break;
      }
    }

    if (!user) {
      // Debug: Show all users in database
      const allUsers = await User.find({}, 'email username is_email_verified');
      console.log('📋 All users in database AFTER search:', allUsers.map(u => ({ 
        email: u.email, 
        username: u.username,
        verified: u.is_email_verified 
      })));
      console.log('🔍 Searched for:', normalizedEmail);
      console.log('❌ Email comparison:', allUsers.map(u => ({
        stored: u.email,
        searched: normalizedEmail,
        match: u.email === normalizedEmail,
        stored_lower: u.email?.toLowerCase(),
        searched_lower: normalizedEmail.toLowerCase()
      })));
      
      return res.status(404).json({ 
        success: false, 
        error: 'User not found. Please register first.' 
      });
    }

    console.log('✅ User found:', { 
      id: user._id, 
      email: user.email, 
      username: user.username,
      verified: user.is_email_verified,
      hasOTP: !!user.otp_code,
      otp_expires: user.otp_expires_at 
    });

    if (user.is_email_verified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already verified. Please login.' 
      });
    }

    // Verify OTP
    console.log('🔐 Verifying OTP:', {
      provided_otp: otp_code,
      stored_otp: user.otp_code,
      otp_expires: user.otp_expires_at,
      is_expired: user.otp_expires_at ? new Date() > user.otp_expires_at : 'no expiry'
    });
    
    const otpValid = user.verifyOTP(otp_code);
    console.log('🔐 OTP Verification Result:', otpValid);
    
    if (!otpValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or expired OTP code' 
      });
    }

    // Mark email as verified and clear OTP
    user.is_email_verified = true;
    user.otp_code = null;
    user.otp_expires_at = null;
    await user.save();

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

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (otp_type === 'registration' && user.is_email_verified) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already verified' 
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, otp_type);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send OTP email' 
      });
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

