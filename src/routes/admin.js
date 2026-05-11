import express from 'express';
import { authenticate, requireAdminEmail } from '../middleware/auth.js';
import EventRegistration from '../models/EventRegistration.js';
import User from '../models/User.js';
import Visitor from '../models/Visitor.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// Helper function to convert registrations to CSV
const convertToCSV = (registrations) => {
  if (!registrations || registrations.length === 0) {
    return 'No registrations found';
  }

  // CSV Headers
  const headers = [
    'Registration ID',
    'Event Name',
    'Event Slug',
    'Team Name',
    'Team Size',
    'Team Leader Name',
    'Team Leader Email',
    'Team Leader Mobile',
    'User Email',
    'User Name',
    'User College',
    'User Roll No',
    'Member 2 Name',
    'Member 2 Email',
    'Member 2 Mobile',
    'Member 3 Name',
    'Member 3 Email',
    'Member 3 Mobile',
    'Member 4 Name',
    'Member 4 Email',
    'Member 4 Mobile',
    'Feedback',
    'Status',
    'Registration Date'
  ];

  // CSV Rows
  const rows = registrations.map(reg => {
    const user = reg.user_id || {};
    const members = reg.members || [];
    
    return [
      reg._id || '',
      reg.event_name || '',
      reg.event_slug || '',
      reg.team_name || '',
      reg.team_size || '',
      members[0]?.name || '',
      members[0]?.email || '',
      members[0]?.mobile || '',
      user.email || '',
      user.full_name || '',
      user.college || '',
      user.roll_no || '',
      members[1]?.name || '',
      members[1]?.email || '',
      members[1]?.mobile || '',
      members[2]?.name || '',
      members[2]?.email || '',
      members[2]?.mobile || '',
      members[3]?.name || '',
      members[3]?.email || '',
      members[3]?.mobile || '',
      (reg.feedback || '').replace(/"/g, '""'), // Escape quotes in CSV
      reg.status || '',
      reg.registration_date ? new Date(reg.registration_date).toISOString() : ''
    ];
  });

  // Escape CSV values and wrap in quotes if needed
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  return csvContent;
};

// Get registration statistics
router.get('/registrations/stats', authenticate, requireAdminEmail, cacheMiddleware(60), async (req, res) => {
  try {
    const totalRegistrations = await EventRegistration.countDocuments({ status: { $ne: 'cancelled' } });
    const confirmedRegistrations = await EventRegistration.countDocuments({ status: 'confirmed' });
    const pendingRegistrations = await EventRegistration.countDocuments({ status: 'pending' });
    const cancelledRegistrations = await EventRegistration.countDocuments({ status: 'cancelled' });

    // Group by event
    const registrationsByEvent = await EventRegistration.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$event_slug', count: { $sum: 1 }, eventName: { $first: '$event_name' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalRegistrations,
        confirmed: confirmedRegistrations,
        pending: pendingRegistrations,
        cancelled: cancelledRegistrations,
        byEvent: registrationsByEvent
      }
    });
  } catch (error) {
    console.error('Registration stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get registration statistics' 
    });
  }
});

// Get all registrations with details
router.get('/registrations', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { event_slug, status, page = 1, limit = 100 } = req.query;
    
    const query = {};
    if (event_slug) query.event_slug = event_slug;
    if (status) query.status = status;
    else query.status = { $ne: 'cancelled' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [registrations, total] = await Promise.all([
      EventRegistration.find(query)
        .populate('user_id', 'email full_name phone_number college roll_no branch year')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EventRegistration.countDocuments(query),
    ]);

    res.json({
      success: true,
      registrations: registrations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get registrations' 
    });
  }
});

// Export registrations to CSV
router.get('/registrations/export', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { event_slug, status } = req.query;
    
    const query = {};
    if (event_slug) query.event_slug = event_slug;
    if (status) query.status = status;
    else query.status = { $ne: 'cancelled' };

    const registrations = await EventRegistration.find(query)
      .populate('user_id', 'email full_name phone_number college roll_no branch year')
      .sort({ created_at: -1 })
      .lean();

    const csvContent = convertToCSV(registrations);

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="registrations_${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export registrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to export registrations' 
    });
  }
});

// Get visitor statistics
router.get('/visitors/stats', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const totalVisitors = await Visitor.countDocuments();
    const uniqueVisitors = await Visitor.countDocuments({ is_unique: true });
    
    // Visitors by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVisitors = await Visitor.countDocuments({
      visited_at: { $gte: thirtyDaysAgo }
    });

    // Visitors today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitorsToday = await Visitor.countDocuments({
      visited_at: { $gte: today }
    });

    // Visitors this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const visitorsThisWeek = await Visitor.countDocuments({
      visited_at: { $gte: weekAgo }
    });

    // Most visited pages
    const topPages = await Visitor.aggregate([
      { $group: { _id: '$page_visited', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalVisitors,
        unique: uniqueVisitors,
        today: visitorsToday,
        thisWeek: visitorsThisWeek,
        last30Days: recentVisitors,
        topPages: topPages
      }
    });
  } catch (error) {
    console.error('Visitor stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get visitor statistics' 
    });
  }
});

// Track visitor (public endpoint, no auth required)
router.post('/visitors/track', async (req, res) => {
  try {
    const { page_visited = '/', referrer = '', session_id = '' } = req.body;
    
    // Get IP address
    const ip_address = req.ip || 
                      req.headers['x-forwarded-for']?.split(',')[0] || 
                      req.connection.remoteAddress || 
                      'unknown';
    
    // Get user agent
    const user_agent = req.headers['user-agent'] || '';

    // Check if this is a unique visitor (same IP in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentVisit = await Visitor.findOne({
      ip_address: ip_address,
      visited_at: { $gte: oneDayAgo }
    });

    const is_unique = !recentVisit;

    // Create visitor record
    const visitor = new Visitor({
      ip_address,
      user_agent,
      page_visited,
      referrer,
      session_id,
      is_unique,
      visited_at: new Date()
    });

    await visitor.save();

    res.json({
      success: true,
      message: 'Visitor tracked'
    });
  } catch (error) {
    console.error('Visitor tracking error:', error);
    // Don't fail the request if tracking fails
    res.json({
      success: false,
      error: error.message
    });
  }
});

// ==================== DATABASE MANAGEMENT ====================

// Get all users (for admin management)
router.get('/users', authenticate, requireAdminEmail, cacheMiddleware(30), async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -otp_code -reset_token -otp_expires_at -reset_token_expires_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get users' 
    });
  }
});

// Create single user
router.post('/users', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { username, full_name, email, phone_number, college, branch, year, roll_no, password, membership_type, designation } = req.body;
    
    // Validate required fields
    if (!username || !full_name || !email || !phone_number || !college || !branch || !year || !roll_no || !password || !membership_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email or username already exists' 
      });
    }
    
    // Create user
    const user = new User({
      username,
      full_name,
      email: email.toLowerCase(),
      phone_number,
      college,
      branch,
      year,
      roll_no,
      password, // Will be hashed by pre-save hook
      membership_type,
      designation: designation || '',
      is_email_verified: true, // Admin-created users are auto-verified
      role: 'user'
    });
    
    // Generate IEEE membership ID if IEEE member
    if (membership_type === 'ieee_member') {
      await user.generateIEEEMembershipID();
    }
    
    await user.save();
    
    res.json({
      success: true,
      user: user.toJSON(),
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create user' 
    });
  }
});

// Delete single user
router.delete('/users/:id', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Also delete user's registrations
    await EventRegistration.deleteMany({ user_id: id });
    
    await User.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'User and associated registrations deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete user' 
    });
  }
});

// Bulk delete users
router.post('/users/bulk-delete', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { user_ids } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide an array of user IDs' 
      });
    }
    
    // Delete registrations first
    await EventRegistration.deleteMany({ user_id: { $in: user_ids } });
    
    // Delete users
    const result = await User.deleteMany({ _id: { $in: user_ids } });
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} user(s) and their registrations`
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete users' 
    });
  }
});

// Bulk create users (from CSV or array)
router.post('/users/bulk-create', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide an array of users' 
      });
    }
    
    const createdUsers = [];
    const errors = [];
    
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      try {
        // Validate required fields
        if (!userData.username || !userData.full_name || !userData.email || !userData.phone_number || 
            !userData.college || !userData.branch || !userData.year || !userData.roll_no || !userData.password || !userData.membership_type) {
          errors.push({ index: i, error: 'Missing required fields', data: userData });
          continue;
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ 
          $or: [{ email: userData.email.toLowerCase() }, { username: userData.username }] 
        });
        
        if (existingUser) {
          errors.push({ index: i, error: 'User already exists', data: userData });
          continue;
        }
        
        // Create user
        const user = new User({
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email.toLowerCase(),
          phone_number: userData.phone_number,
          college: userData.college,
          branch: userData.branch,
          year: userData.year,
          roll_no: userData.roll_no,
          password: userData.password,
          membership_type: userData.membership_type,
          designation: userData.designation || '',
          is_email_verified: true,
          role: 'user'
        });
        
        if (userData.membership_type === 'ieee_member') {
          await user.generateIEEEMembershipID();
        }
        
        await user.save();
        createdUsers.push(user.toJSON());
      } catch (error) {
        errors.push({ index: i, error: error.message, data: userData });
      }
    }
    
    res.json({
      success: true,
      created: createdUsers.length,
      failed: errors.length,
      users: createdUsers,
      errors: errors
    });
  } catch (error) {
    console.error('Bulk create users error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create users' 
    });
  }
});

// Delete single registration
router.delete('/registrations/:id', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { id } = req.params;
    
    const registration = await EventRegistration.findById(id);
    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration not found' 
      });
    }
    
    await EventRegistration.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete registration' 
    });
  }
});

// Bulk delete registrations
router.post('/registrations/bulk-delete', authenticate, requireAdminEmail, async (req, res) => {
  try {
    const { registration_ids } = req.body;
    
    if (!registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide an array of registration IDs' 
      });
    }
    
    const result = await EventRegistration.deleteMany({ _id: { $in: registration_ids } });
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} registration(s)`
    });
  } catch (error) {
    console.error('Bulk delete registrations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete registrations' 
    });
  }
});

export default router;


