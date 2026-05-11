import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdminEmail } from '../middleware/auth.js';
import Announcement from '../models/Announcement.js';
import { uploadAnnouncementImage } from '../middleware/upload.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// Validation middleware
const createAnnouncementValidation = [
  body('heading').trim().isLength({ min: 1, max: 200 }).withMessage('Heading is required (max 200 characters)'),
  body('body').trim().isLength({ min: 1, max: 5000 }).withMessage('Body is required (max 5000 characters)'),
];

// Create announcement (Admin only)
router.post('/', authenticate, requireAdminEmail, uploadAnnouncementImage, createAnnouncementValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    // Handle file validation
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        error: req.fileValidationError
      });
    }

    // Check file size (2MB limit)
    if (req.file && req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Image must be less than 2MB'
      });
    }

    const { heading, body } = req.body;
    const userId = req.userId;

    // Convert image to base64 if provided
    let imageUrl = null;
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      imageUrl = `data:${mimeType};base64,${base64Image}`;
    }

    const announcement = new Announcement({
      heading,
      body,
      image_url: imageUrl,
      created_by: userId
    });

    await announcement.save();
    await announcement.populate('created_by', 'full_name email');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create announcement'
    });
  }
});

// Get all announcements (public, sorted by newest first)
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('created_by', 'full_name email')
      .sort({ _id: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      announcements,
      count: announcements.length
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch announcements'
    });
  }
});

// Get single announcement
router.get('/:id', cacheMiddleware(300), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('created_by', 'full_name email');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch announcement'
    });
  }
});

// Delete announcement (Admin only)
router.delete('/:id', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
    }

    await announcement.deleteOne();

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete announcement'
    });
  }
});

export default router;
