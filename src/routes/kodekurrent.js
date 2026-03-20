import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import KodekurrentTeam from '../models/KodekurrentTeam.js';
import Announcement from '../models/Announcement.js';
import { authenticate } from '../middleware/auth.js';

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
router.get('/announcements', async (req, res) => {
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
router.get('/dashboard', authenticate, async (req, res) => {
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
// Body: { team_name, member_emails: string[] (2-4 total) }
// The requesting user is always included as team lead
// ─────────────────────────────────────────
router.post('/register-team', authenticate, async (req, res) => {
  try {
    const { team_name, member_emails = [] } = req.body;

    if (!team_name || typeof team_name !== 'string' || team_name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'A valid team name is required (min 2 chars).' });
    }

    // Normalize all emails
    const normalizedMemberEmails = member_emails.map(normalizeEmail);

    // Build a deduplicated set of all participants (lead + members)
    const leadEmail = normalizeEmail(req.user.email);
    const allEmails = [...new Set([leadEmail, ...normalizedMemberEmails])];

    if (allEmails.length < 2 || allEmails.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Team must have between 2 and 4 members (including yourself).',
      });
    }

    // Parallel check: does team name exist + is lead already in a team + do all member emails exist?
    const [existingTeamByName, leadTeam, memberUsers] = await Promise.all([
      KodekurrentTeam.findOne({ team_name: team_name.trim() }).lean(),
      KodekurrentTeam.findOne({
        $or: [
          { team_lead: req.userId },
          { 'members.user': req.userId },
        ],
      }).lean(),
      User.find({ email: { $in: allEmails } })
        .select('_id email full_name roll_no is_email_verified')
        .lean(),
    ]);

    if (existingTeamByName) {
      return res.status(409).json({ success: false, error: 'Team name already taken. Please choose another.' });
    }

    if (leadTeam) {
      return res.status(409).json({ success: false, error: 'You are already registered in a team.' });
    }

    // Validate all emails are known registered users
    const foundEmails = new Set(memberUsers.map(u => u.email));
    const missingEmails = allEmails.filter(e => !foundEmails.has(e));
    if (missingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: `These member emails are not registered: ${missingEmails.join(', ')}. All members must be registered users.`,
      });
    }

    // Verify all members have verified emails
    const unverified = memberUsers.filter(u => !u.is_email_verified);
    if (unverified.length > 0) {
      return res.status(400).json({
        success: false,
        error: `These members have unverified accounts: ${unverified.map(u => u.email).join(', ')}. All members must verify their email first.`,
      });
    }

    // Check if any member is already in another team
    const memberUserIds = memberUsers.map(u => u._id);
    const conflictingTeam = await KodekurrentTeam.findOne({
      $or: [
        { team_lead: { $in: memberUserIds } },
        { 'members.user': { $in: memberUserIds } },
      ],
    }).lean();

    if (conflictingTeam) {
      return res.status(409).json({
        success: false,
        error: `One or more team members are already registered in another team ("${conflictingTeam.team_name}"). Each user can only be in one team.`,
      });
    }

    // Build members array
    const membersData = memberUsers.map(u => ({
      user: u._id,
      email: u.email,
      full_name: u.full_name,
      roll_no: u.roll_no || '',
    }));

    const team = new KodekurrentTeam({
      team_name: team_name.trim(),
      team_lead: req.userId,
      members: membersData,
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: 'Team registered successfully!',
      team,
    });
  } catch (error) {
    console.error('Team registration error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Team name already taken.' });
    }
    res.status(500).json({ success: false, error: 'Failed to register team. Please try again.' });
  }
});

// ─────────────────────────────────────────
// PROTECTED: Get the current user's team
// GET /kodekurrent/team
// ─────────────────────────────────────────
router.get('/team', authenticate, async (req, res) => {
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
