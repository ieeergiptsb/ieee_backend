import express from 'express';
import { authenticate } from '../middleware/auth.js';
import EventRegistration from '../models/EventRegistration.js';
import User from '../models/User.js';
import { uploadProfilePicture } from '../middleware/upload.js';
import { generateIDCard } from '../utils/idCardGenerator.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const [registrations, upcomingCount] = await Promise.all([
      EventRegistration.find({
        user_id: userId,
        status: { $ne: 'cancelled' },
      }).sort({ created_at: -1 }).limit(10).lean(),
      EventRegistration.countDocuments({
        user_id: userId,
        status: 'confirmed',
      }),
    ]);

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

// Generate and return member ID card
router.get('/id-card', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Generate ID card with member information
    // For IEEE members, use designation if available (will be formatted nicely in idCardGenerator)
    // For non-members, use "Member"
    let teamNameForCard = 'Member';
    if (user.membership_type === 'ieee_member') {
      // Pass the raw designation - it will be formatted in idCardGenerator
      teamNameForCard = user.designation || 'IEEE Member';
    }
    
    const idCardBuffer = await generateIDCard({
      userName: user.full_name || 'Member',
      userPhoto: user.profile_image_url,
      teamName: teamNameForCard, // This is the designation for IEEE members
      eventName: 'IEEE Student Branch, RGIPT', // Organization name
      userCollege: user.college || '',
      userRollNo: user.roll_no || '',
      membershipType: user.membership_type || 'non_member',
      ieeeMembershipId: user.ieee_membership_id || null,
      userDesignation: user.designation || null, // Pass designation explicitly for better formatting
    });

    // Set response headers for image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="ieee_member_id_card.png"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send the image buffer
    res.send(idCardBuffer);
  } catch (error) {
    console.error('ID card generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate ID card' 
    });
  }
});

// Get team members by designation (for team page)
// Returns all verified IEEE members with their profile images (uploaded during registration)
// When IEEE members register and upload their photo, it's saved to profile_image_url and appears here
router.get('/team-members', async (req, res) => {
  try {
    const { designation } = req.query;
    
    // Build query - only get verified IEEE members with designations
    // Profile images are automatically included from profile_image_url field
    const query = {
      membership_type: 'ieee_member',
      is_email_verified: true,
    };
    
    // If designation is provided, filter by it
    if (designation) {
      query.designation = designation;
    }
    
    const members = await User.find(query)
      .select('full_name designation profile_image_url linkedin_url github_url instagram_url bio achievements ieee_membership_id email')
      .sort({ designation: 1, full_name: 1 })
      .lean();
    
    // Map designations to team names and determine if head or cohead
    const getTeamInfo = (designation) => {
      if (!designation) return { team: 'General', role: 'Member', isHead: false };
      
      // Check if it's an executive officer position
      const executivePositions = ['Chair', 'Vice Chair', 'Secretary', 'Treasurer', 'Web Master'];
      if (executivePositions.includes(designation)) {
        return { team: 'Leaders', role: designation, isHead: true, isExecutive: true };
      }
      
      // Check if it's a head designation
      const isHead = designation.includes('_Head') || 
                     designation.includes('_Cohead') || 
                     designation === 'Joint_Sec';
      
      // Map designation to team name
      const teamMap = {
        'Joint_Sec': 'Joint Secretaries',
        'Design': 'Design',
        'Audit': 'Audit',
        'Editorial': 'Editorial',
        'WIE': 'WIE',
        'ComSoc': 'ComSoc',
        'RAS': 'RAS',
        'CS': 'CS',
        'CS_Head': 'CS',
        'CS_Cohead': 'CS',
        'EVENT': 'Event',
        'CNM': 'CNM',
        'Member': 'General'
      };
      
      const team = teamMap[designation] || 'General';
      const role = isHead ? 'Head' : 'Cohead';
      
      return { team, role, isHead, isExecutive: false };
    };
    
    // Transform to team member format
    const teamMembers = members.map(member => {
      const { team, role, isHead, isExecutive } = getTeamInfo(member.designation);
      return {
        name: member.full_name,
        position: isExecutive ? role : `${role} - ${team}`, // e.g., "Chair" for executives or "Head - CS" for teams
        team: team,
        role: role,
        isHead: isHead,
        isExecutive: isExecutive || false,
        designation: member.designation || 'Member',
        linkedin: member.linkedin_url || '',
        github: member.github_url || '',
        instagram: member.instagram_url || '',
        image: member.profile_image_url || null, // Profile image uploaded during registration
        bio: member.bio || '',
        email: member.email,
        ieee_membership_id: member.ieee_membership_id,
        achievements: member.achievements || '',
        is_ieee_member: true, // All team members are IEEE members
      };
    });
    
    // Group by team
    const membersByTeam = {};
    teamMembers.forEach(member => {
      if (!membersByTeam[member.team]) {
        membersByTeam[member.team] = [];
      }
      membersByTeam[member.team].push(member);
    });
    
    // Sort each team: heads first, then coheads, then by name
    Object.keys(membersByTeam).forEach(team => {
      membersByTeam[team].sort((a, b) => {
        // Heads first
        if (a.isHead && !b.isHead) return -1;
        if (!a.isHead && b.isHead) return 1;
        // Then by name
        return a.name.localeCompare(b.name);
      });
    });
    
    res.json({
      success: true,
      members: teamMembers,
      membersByTeam: membersByTeam,
      count: teamMembers.length,
    });
  } catch (error) {
    console.error('Team members error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch team members' 
    });
  }
});

// Get a single team member by slug (name-based slug)
router.get('/team-members/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get all team members
    const query = {
      membership_type: 'ieee_member',
      is_email_verified: true,
    };
    
    const members = await User.find(query)
      .select('full_name designation profile_image_url linkedin_url github_url instagram_url bio achievements ieee_membership_id email')
      .sort({ designation: 1, full_name: 1 })
      .lean();

    
    // Helper to generate slug from name
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    };
    
    // Find member by matching slug
    const member = members.find(m => {
      const memberSlug = generateSlug(m.full_name);
      return memberSlug === slug;
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    
    // Map designation to team info (same logic as team-members endpoint)
    const getTeamInfo = (designation) => {
      if (!designation) return { team: 'General', role: 'Member', isHead: false };
      
      const executivePositions = ['Chair', 'Vice Chair', 'Secretary', 'Treasurer', 'Web Master'];
      if (executivePositions.includes(designation)) {
        return { team: 'Leaders', role: designation, isHead: true, isExecutive: true };
      }
      
      const isHead = designation.includes('_Head') || 
                     designation.includes('_Cohead') || 
                     designation === 'Joint_Sec';
      
      const teamMap = {
        'Joint_Sec': 'Joint Secretaries',
        'Design': 'Design',
        'Audit': 'Audit',
        'Editorial': 'Editorial',
        'WIE': 'WIE',
        'ComSoc': 'ComSoc',
        'RAS': 'RAS',
        'CS': 'CS',
        'CS_Head': 'CS',
        'CS_Cohead': 'CS',
        'EVENT': 'Event',
        'CNM': 'CNM',
        'Member': 'General'
      };
      
      const team = teamMap[designation] || 'General';
      const role = isHead ? 'Head' : 'Cohead';
      
      return { team, role, isHead, isExecutive: false };
    };
    
    const { team, role, isHead, isExecutive } = getTeamInfo(member.designation);
    
    const memberData = {
      name: member.full_name,
      position: isExecutive ? role : `${role} - ${team}`,
      team: team,
      role: role,
      isHead: isHead,
      isExecutive: isExecutive || false,
      designation: member.designation || 'Member',
      linkedin: member.linkedin_url || '',
      github: member.github_url || '',
      instagram: member.instagram_url || '',
      email: member.email || '',
      image: member.profile_image_url || null,
      bio: member.bio || '',
      achievements: member.achievements || '',
      ieee_membership_id: member.ieee_membership_id,
      is_ieee_member: true,
      slug: generateSlug(member.full_name)
    };
    
    res.json({
      success: true,
      member: memberData
    });
  } catch (error) {
    console.error('Team member error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch team member' 
    });
  }
});

export default router;






