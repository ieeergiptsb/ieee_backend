import express from 'express';
import BootcampEvent from '../models/BootcampEvent.js';
import BootcampRegistration from '../models/BootcampRegistration.js';
import BootcampUpdate from '../models/BootcampUpdate.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { sendBootcampRegistrationConfirmationEmail } from '../utils/email.js';

const router = express.Router();

router.get('/events', cacheMiddleware(120), async (_req, res) => {
  try {
    const events = await BootcampEvent.find({ is_active: true })
      .select(
        'title slug tagline short_description duration category banner_url start_date end_date highlights topics createdAt'
      )
      .sort({ start_date: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, events });
  } catch (e) {
    console.error('Bootcamp list error:', e);
    res.status(500).json({ success: false, error: 'Failed to load programs' });
  }
});

router.get('/events/:slug', cacheMiddleware(60), async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const event = await BootcampEvent.findOne({ slug, is_active: true }).lean();
    if (!event) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }
    res.json({ success: true, event });
  } catch (e) {
    console.error('Bootcamp get error:', e);
    res.status(500).json({ success: false, error: 'Failed to load program' });
  }
});

router.get('/my-registrations', authenticate, async (req, res) => {
  try {
    const rows = await BootcampRegistration.find({ user_id: req.userId })
      .populate('event', 'slug title tagline short_description duration banner_url')
      .sort({ registered_at: -1 })
      .lean();
    res.json({ success: true, registrations: rows });
  } catch (e) {
    console.error('Bootcamp my-regs error:', e);
    res.status(500).json({ success: false, error: 'Failed to load registrations' });
  }
});

router.get('/events/:slug/me', authenticate, async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const event = await BootcampEvent.findOne({ slug, is_active: true }).select('_id').lean();
    if (!event) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }
    const reg = await BootcampRegistration.findOne({
      user_id: req.userId,
      event: event._id,
    })
      .select('_id registered_at')
      .lean();
    res.json({ success: true, registered: !!reg, registration: reg || null });
  } catch (e) {
    console.error('Bootcamp me error:', e);
    res.status(500).json({ success: false, error: 'Failed to check registration' });
  }
});

router.post('/events/:slug/register', authenticate, async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const event = await BootcampEvent.findOne({ slug, is_active: true });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Program not found or closed' });
    }
    const existing = await BootcampRegistration.findOne({
      user_id: req.userId,
      event: event._id,
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You are already registered for this program' });
    }
    const registration = await BootcampRegistration.create({
      user_id: req.userId,
      event: event._id,
    });

    const frontend = process.env.FRONTEND_URL || 'https://ieeergipt.in';
    const dashboardUrl = `${frontend.replace(/\/$/, '')}/dashboard`;
    try {
      const u = await User.findById(req.userId).select('email full_name').lean();
      if (u?.email) {
        await sendBootcampRegistrationConfirmationEmail(
          u.email,
          event.title,
          u.full_name,
          dashboardUrl
        );
      }
    } catch (mailErr) {
      console.warn('Bootcamp confirmation email skipped:', mailErr?.message || mailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      registration: { _id: registration._id, registered_at: registration.registered_at },
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, error: 'Already registered' });
    }
    console.error('Bootcamp register error:', e);
    res.status(500).json({ success: false, error: e.message || 'Registration failed' });
  }
});

router.get('/events/:slug/updates', authenticate, async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const event = await BootcampEvent.findOne({ slug, is_active: true }).select('_id').lean();
    if (!event) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }
    const reg = await BootcampRegistration.findOne({ user_id: req.userId, event: event._id }).lean();
    if (!reg) {
      return res.status(403).json({ success: false, error: 'Register for this program to view updates' });
    }
    const updates = await BootcampUpdate.find({ event: event._id })
      .sort({ createdAt: -1 })
      .select('title short_description link createdAt')
      .lean();
    res.json({ success: true, updates });
  } catch (e) {
    console.error('Bootcamp updates error:', e);
    res.status(500).json({ success: false, error: 'Failed to load updates' });
  }
});

export default router;
