import express from 'express';
import { body, validationResult } from 'express-validator';
import Contact from '../models/Contact.js';
import { sendContactFormEmail } from '../utils/email.js';
import { authenticate, requireAdminEmail } from '../middleware/auth.js';

const router = express.Router();

// Contact form validation
const contactValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').trim().isLength({ min: 3 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
];

// Submit contact form
router.post('/submit', contactValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    const { name, email, subject, message } = req.body;

    // Save contact form submission to database
    const contact = new Contact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      status: 'new',
    });

    await contact.save();

    // Send email to ieee_sb@rgipt.ac.in
    const emailResult = await sendContactFormEmail({
      fromName: name,
      fromEmail: email,
      subject: subject,
      message: message,
    });

    if (!emailResult.success) {
      console.error('⚠️ Failed to send contact form email:', emailResult.error);
      // Still return success since the form was saved to database
    }

    res.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      contactId: contact._id,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to submit contact form' 
    });
  }
});

// Get all contact form submissions (Admin only)
router.get('/', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && ['new', 'read', 'replied', 'archived'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contact.countDocuments(query),
    ]);

    res.json({
      success: true,
      contacts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch contacts' 
    });
  }
});

// Update contact status (Admin only)
router.patch('/:id/status', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }

    const updateData = { status };
    if (status === 'replied') {
      updateData.replied_at = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update contact status' 
    });
  }
});

// Delete contact (Admin only)
router.delete('/:id', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        error: 'Contact not found' 
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete contact' 
    });
  }
});

// Bulk delete contacts (Admin only)
router.post('/bulk-delete', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid contact IDs' 
      });
    }

    const result = await Contact.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} contact(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete contacts' 
    });
  }
});

export default router;


