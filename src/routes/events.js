import express from 'express';
import { body, validationResult } from 'express-validator';
import EventRegistration from '../models/EventRegistration.js';
import { authenticate } from '../middleware/auth.js';
import { sendRegistrationConfirmationEmail } from '../utils/email.js';

const router = express.Router();

// Validation middleware
const registrationValidation = [
  body('event_name').trim().notEmpty().withMessage('Event name is required'),
  body('event_slug').trim().notEmpty().withMessage('Event slug is required'),
  body('team_name').trim().notEmpty().withMessage('Team name is required'),
  body('team_size').isInt({ min: 1, max: 10 }).withMessage('Team size must be between 1 and 10'),
  body('members').isArray().withMessage('Members must be an array'),
  body('members.*.name').trim().notEmpty().withMessage('Member name is required'),
  body('members.*.email').isEmail().withMessage('Valid member email is required'),
  body('members.*.mobile').trim().notEmpty().withMessage('Member mobile is required'),
];

// Register for an event
router.post('/register', authenticate, registrationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    const { event_name, event_slug, team_name, team_size, members, feedback } = req.body;

    // Validate team size matches members array
    if (members.length !== team_size) {
      return res.status(400).json({ 
        success: false, 
        error: 'Number of members must match team size' 
      });
    }

    // Check if user already registered for this event
    const existingRegistration = await EventRegistration.findOne({
      user_id: req.userId,
      event_slug: event_slug,
      status: { $ne: 'cancelled' },
    });

    if (existingRegistration) {
      return res.status(400).json({ 
        success: false, 
        error: 'You are already registered for this event' 
      });
    }

    // Create event registration
    const registration = new EventRegistration({
      user_id: req.userId,
      event_name,
      event_slug,
      team_name,
      team_size,
      members: members.map(m => ({
        name: m.name.trim(),
        email: m.email.toLowerCase().trim(),
        mobile: m.mobile.trim(),
      })),
      feedback: feedback || '',
      status: 'confirmed',
    });

    await registration.save();

    // Populate user data for email
    const registrationWithUser = await EventRegistration.findById(registration._id)
      .populate('user_id', 'email full_name');

    // Send confirmation email
    if (registrationWithUser.user_id?.email) {
      await sendRegistrationConfirmationEmail(
        registrationWithUser.user_id.email,
        event_name,
        team_name
      );
    }

    res.status(201).json({
      success: true,
      message: 'Successfully registered for the event',
      registration: registration,
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Registration failed. Please try again.' 
    });
  }
});

// Get user's event registrations
router.get('/my-registrations', authenticate, async (req, res) => {
  try {
    const registrations = await EventRegistration.find({
      user_id: req.userId,
      status: { $ne: 'cancelled' },
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      registrations: registrations,
      count: registrations.length,
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get registrations' 
    });
  }
});

// Get specific registration
router.get('/registration/:id', authenticate, async (req, res) => {
  try {
    const registration = await EventRegistration.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found' 
      });
    }

    res.json({
      success: true,
      registration: registration,
    });
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get registration' 
    });
  }
});

// Cancel registration
router.patch('/registration/:id/cancel', authenticate, async (req, res) => {
  try {
    const registration = await EventRegistration.findOne({
      _id: req.params.id,
      user_id: req.userId,
    });

    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found' 
      });
    }

    if (registration.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        error: 'Registration already cancelled' 
      });
    }

    registration.status = 'cancelled';
    await registration.save();

    res.json({
      success: true,
      message: 'Registration cancelled successfully',
      registration: registration,
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to cancel registration' 
    });
  }
});

// Get all registrations for an event (Admin only)
router.get('/event/:eventSlug/registrations', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const registrations = await EventRegistration.find({
      event_slug: req.params.eventSlug,
      status: { $ne: 'cancelled' },
    })
      .populate('user_id', 'full_name email phone_number college branch year')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      registrations: registrations,
      count: registrations.length,
    });
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get registrations' 
    });
  }
});

export default router;



