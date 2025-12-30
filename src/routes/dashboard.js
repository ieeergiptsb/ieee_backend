import express from 'express';
import { authenticate } from '../middleware/auth.js';
import EventRegistration from '../models/EventRegistration.js';
import User from '../models/User.js';
import { uploadProfilePicture } from '../middleware/upload.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's registrations
    const registrations = await EventRegistration.find({
      user_id: userId,
      status: { $ne: 'cancelled' },
    }).sort({ created_at: -1 }).limit(10);

    // Get upcoming events count (you can customize this based on your event logic)
    const upcomingCount = await EventRegistration.countDocuments({
      user_id: userId,
      status: 'confirmed',
    });

    res.json({
      success: true,
      data: {
        upcoming_events: upcomingCount,
        recent_registrations: registrations,
        total_registrations: registrations.length,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to load dashboard data' 
    });
  }
});

// Update user profile (with optional profile picture upload)
router.put('/profile', authenticate, uploadProfilePicture, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

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

    // Update profile picture if provided
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      user.profile_image_url = `data:${mimeType};base64,${base64Image}`;
    }

    // Update other profile fields
    const { designation, bio, branch, achievements, linkedin_url, github_url, instagram_url } = req.body;
    
    if (designation !== undefined) user.designation = designation;
    if (bio !== undefined) user.bio = bio;
    if (branch !== undefined) user.branch = branch;
    if (achievements !== undefined) user.achievements = achievements;
    if (linkedin_url !== undefined) user.linkedin_url = linkedin_url;
    if (github_url !== undefined) user.github_url = github_url;
    if (instagram_url !== undefined) user.instagram_url = instagram_url;

    await user.save();

    res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update profile' 
    });
  }
});

export default router;






