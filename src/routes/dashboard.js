import express from 'express';
import { authenticate } from '../middleware/auth.js';
import EventRegistration from '../models/EventRegistration.js';
import User from '../models/User.js';

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

export default router;



