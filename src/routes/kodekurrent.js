import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import KodekurrentTeam from '../models/KodekurrentTeam.js';
import Announcement from '../models/Announcement.js';
import { authenticate } from '../middleware/auth.js';
import { sendTeamInviteEmail, sendTeamCompletionEmail } from '../utils/email.js';
import { cacheMiddleware, clearCache } from '../middleware/cache.js';

const router = express.Router();

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const normalizeEmail = (email) => {
  if (!email) return '';
  let normalized = email.toLowerCase().trim();
  if (normalized.includes('@gmail.com')) {
    const [localPart, domain] = normalized.split('@');
    normalized = localPart.replace(/\./g, '') + '@' + domain;
  }
  return normalized;
};

// ─────────────────────────────────────────
// PUBLIC: Get Kodekurrent Announcements
// GET /kodekurrent/announcements
// ─────────────────────────────────────────
router.get('/announcements', cacheMiddleware(300), async (req, res) => {
  try {
    const announcements = await Announcement.find(
      { category: 'kodekurrent' },  // filter by category; fallback: all if none set
    )
      .sort({ created_at: -1 })
      .limit(20)
      .lean(); // .lean() returns plain JS objects — much faster for read-only

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Get dashboard data for logged-in user
// GET /kodekurrent/dashboard
// ─────────────────────────────────────────
router.get('/dashboard', authenticate, cacheMiddleware(60), async (req, res) => {
  try {
    // Fire both queries in parallel with Promise.all for max throughput
    const [user, team, announcements] = await Promise.all([
      User.findById(req.userId)
        .select('-password -otp_code -otp_expires_at -reset_token -reset_token_expires_at')
        .lean(),
      KodekurrentTeam.findOne({
        $or: [
          { team_lead: req.userId },
          { 'members.user': req.userId },
        ],
      }).lean(),
      Announcement.find({ category: 'kodekurrent' })
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user,
      team: team || null,
      announcements,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Register a hackathon team
// POST /kodekurrent/register-team
// Body: { team_name, member_emails: string[] (2-4 total including lead) }
// ─────────────────────────────────────────
router.post('/register-team', authenticate, async (req, res) => {
  try {
    const { team_name, member_emails = [] } = req.body;

    if (!team_name || typeof team_name !== 'string' || team_name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'A valid team name is required (min 2 chars).' });
    }

    const normalizedMemberEmails = member_emails.map(normalizeEmail).filter(e => e);
    const leadEmail = normalizeEmail(req.user.email);
    const allEmails = [...new Set([leadEmail, ...normalizedMemberEmails])];

    if (allEmails.length < 2 || allEmails.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Team must have between 2 and 4 valid members (including yourself).',
      });
    }

    // Parallel check: team name exists? is anyone in allEmails already in a team?
    const [existingTeamByName, conflictingTeam] = await Promise.all([
      KodekurrentTeam.findOne({ team_name: team_name.trim() }).lean(),
      KodekurrentTeam.findOne({
        $or: [
          { 'members.email': { $in: allEmails } },
          { 'members.user': req.userId }
        ]
      }).lean(),
    ]);

    if (existingTeamByName) {
      return res.status(409).json({ success: false, error: 'Team name already taken. Please choose another.' });
    }

    if (conflictingTeam) {
      return res.status(409).json({
        success: false,
        error: `One or more emails are already associated with a team ("${conflictingTeam.team_name}"). Each person can only be in one team.`
      });
    }

    // Build members array - Lead is Verified, others are Pending
    const membersData = allEmails.map(email => {
      if (email === leadEmail) {
        return {
          email,
          user: req.userId,
          full_name: req.user.full_name,
          roll_no: req.user.roll_no || '',
          status: 'Verified'
        };
      }
      return { email, status: 'Pending' };
    });

    const team = new KodekurrentTeam({
      team_name: team_name.trim(),
      team_lead: req.userId,
      members: membersData,
    });

    await team.save();
    clearCache('__api_cache__/admin/registrations');

    // Generate JWTs and send invite emails asynchronously
    const jwtSecret = process.env.JWT_SECRET || 'ieee_rgipt_super_secret_jwt_key_2025_change_in_production';
    normalizedMemberEmails.forEach(email => {
      if (email !== leadEmail) {
        const token = jwt.sign({ email, teamId: team._id }, jwtSecret, { expiresIn: '7d' });
        sendTeamInviteEmail(email, team.team_name, token).catch(err => console.error('Invite email failed:', err));
      }
    });

    res.status(201).json({
      success: true,
      message: 'Team registered! Invite emails sent to your teammates.',
      team,
    });
  } catch (error) {
    console.error('Team registration error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Team name already taken.' });
    }
    res.status(500).json({ success: false, error: 'Failed to register team.' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Verify Team Invitation
// GET /kodekurrent/verify-team?token=...
// ─────────────────────────────────────────
router.get('/verify-team', authenticate, async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing token.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'ieee_rgipt_super_secret_jwt_key_2025_change_in_production';
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid or expired invitation token.' });
    }

    const inviteEmail = normalizeEmail(decoded.email);
    const userEmail = normalizeEmail(req.user.email);

    if (inviteEmail !== userEmail) {
      return res.status(403).json({ 
        success: false, 
        error: `This invite was sent to ${inviteEmail}, but you are logged in as ${userEmail}. Please login with the correct account.` 
      });
    }

    const team = await KodekurrentTeam.findById(decoded.teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team no longer exists.' });
    }

    // Check if user is already in another team
    const existingTeam = await KodekurrentTeam.findOne({
      _id: { $ne: team._id },
      $or: [
        { 'members.user': req.userId },
        { 'members.email': userEmail }
      ]
    }).lean();

    if (existingTeam) {
      return res.status(409).json({ success: false, error: `You are already in another team ("${existingTeam.team_name}").` });
    }

    const memberIndex = team.members.findIndex(m => m.email === userEmail);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, error: 'You are no longer invited to this team.' });
    }

    if (team.members[memberIndex].status === 'Verified') {
      return res.json({ success: true, message: 'You are already verified in this team.' });
    }

    // Update member to Verified
    team.members[memberIndex].status = 'Verified';
    team.members[memberIndex].user = req.userId;
    team.members[memberIndex].full_name = req.user.full_name;
    team.members[memberIndex].roll_no = req.user.roll_no || '';

    // Check if all members are now verified
    const allVerified = team.members.every(m => m.status === 'Verified');

    await team.save();
    clearCache('__api_cache__/admin/registrations');

    // If all verified, send completion email to team lead
    if (allVerified) {
      const leadUser = await User.findById(team.team_lead).lean();
      if (leadUser) {
        sendTeamCompletionEmail(leadUser.email, team.team_name).catch(err => console.error('Completion email failed:', err));
      }
    }

    res.json({
      success: true,
      message: 'Successfully verified and joined the team!',
      allVerified
    });
  } catch (error) {
    console.error('Verify team error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify team invitation.' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Get the current user's team
// GET /kodekurrent/team
// ─────────────────────────────────────────
router.get('/team', authenticate, cacheMiddleware(60), async (req, res) => {
  try {
    const team = await KodekurrentTeam.findOne({
      $or: [
        { team_lead: req.userId },
        { 'members.user': req.userId },
      ],
    })
      .populate('team_lead', 'full_name email profile_image_url roll_no')
      .lean();

    res.json({ success: true, team: team || null });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Update project title / submission URL
// PATCH /kodekurrent/team/project
// ─────────────────────────────────────────
router.patch('/team/project', authenticate, async (req, res) => {
  try {
    const { project_title, submission_url } = req.body;

    const team = await KodekurrentTeam.findOne({
      $or: [
        { team_lead: req.userId },
        { 'members.user': req.userId },
      ],
    });

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found. Please register your team first.' });
    }

    if (project_title !== undefined) team.project_title = project_title;
    if (submission_url !== undefined) {
      team.submission_url = submission_url;
      team.is_submitted = !!submission_url;
    }

    await team.save();

    res.json({ success: true, message: 'Project updated successfully.', team });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project.' });
  }
});

export default router;
