import express from 'express';
import { body, param, validationResult } from 'express-validator';
import BootcampEvent from '../models/BootcampEvent.js';
import BootcampRegistration from '../models/BootcampRegistration.js';
import BootcampUpdate from '../models/BootcampUpdate.js';
import { clearCache } from '../middleware/cache.js';

const router = express.Router();

const eventCreateValidation = [
  body('title').trim().notEmpty(),
  body('slug').trim().notEmpty().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body('tagline').optional().isString(),
  body('short_description').optional().isString(),
  body('description').optional().isString(),
  body('roadmap').optional().isString(),
  body('highlights').optional().isArray(),
  body('topics').optional().isArray(),
  body('duration').optional().isString(),
  body('category').optional().isString(),
  body('banner_url').optional().isString(),
  body('is_active').optional().isBoolean(),
];

router.get('/events', async (_req, res) => {
  try {
    const events = await BootcampEvent.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, events });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/events', eventCreateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    const doc = await BootcampEvent.create({
      title: req.body.title,
      slug: String(req.body.slug).toLowerCase().trim(),
      tagline: req.body.tagline || '',
      short_description: req.body.short_description || '',
      description: req.body.description || '',
      roadmap: req.body.roadmap || '',
      highlights: Array.isArray(req.body.highlights) ? req.body.highlights : [],
      topics: Array.isArray(req.body.topics) ? req.body.topics : [],
      duration: req.body.duration || '',
      category: req.body.category || 'bootcamp',
      banner_url: req.body.banner_url || null,
      start_date: req.body.start_date || null,
      end_date: req.body.end_date || null,
      is_active: req.body.is_active !== false,
    });
    clearCache('__api_cache__/bootcamp');
    res.status(201).json({ success: true, event: doc });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, error: 'Slug already exists' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch('/events/:id', async (req, res) => {
  try {
    const allowed = [
      'title',
      'tagline',
      'short_description',
      'description',
      'roadmap',
      'highlights',
      'topics',
      'duration',
      'category',
      'banner_url',
      'start_date',
      'end_date',
      'is_active',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const event = await BootcampEvent.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ success: false, error: 'Not found' });
    clearCache('__api_cache__/bootcamp');
    res.json({ success: true, event });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await BootcampUpdate.deleteMany({ event: req.params.id });
    await BootcampRegistration.deleteMany({ event: req.params.id });
    const r = await BootcampEvent.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ success: false, error: 'Not found' });
    clearCache('__api_cache__/bootcamp');
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/events/:id/updates', async (req, res) => {
  try {
    const updates = await BootcampUpdate.find({ event: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, updates });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const updateValidation = [
  param('id').isMongoId(),
  body('title').trim().notEmpty(),
  body('short_description').optional().isString(),
  body('link').trim().notEmpty().isURL({ require_protocol: true }),
];

router.post('/events/:id/updates', updateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    const ev = await BootcampEvent.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, error: 'Event not found' });
    const u = await BootcampUpdate.create({
      event: ev._id,
      title: req.body.title,
      short_description: req.body.short_description || '',
      link: req.body.link,
    });
    clearCache('__api_cache__/bootcamp');
    res.status(201).json({ success: true, update: u });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch('/updates/:updateId', async (req, res) => {
  try {
    const { title, short_description, link } = req.body;
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (short_description !== undefined) patch.short_description = short_description;
    if (link !== undefined) {
      if (!/^https?:\/\//i.test(link)) {
        return res.status(400).json({ success: false, error: 'Link must be http(s) URL' });
      }
      patch.link = link;
    }
    const u = await BootcampUpdate.findByIdAndUpdate(req.params.updateId, patch, { new: true });
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    clearCache('__api_cache__/bootcamp');
    res.json({ success: true, update: u });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/updates/:updateId', async (req, res) => {
  try {
    const u = await BootcampUpdate.findByIdAndDelete(req.params.updateId);
    if (!u) return res.status(404).json({ success: false, error: 'Not found' });
    clearCache('__api_cache__/bootcamp');
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
