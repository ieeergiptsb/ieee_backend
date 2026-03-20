import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified'],
    default: 'Pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional until they verify
  },
  full_name: {
    type: String,
    trim: true,
    required: false,
  },
  roll_no: {
    type: String,
    trim: true,
    required: false,
  },
}, { _id: false });

const kodekurrentTeamSchema = new mongoose.Schema({
  team_name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  team_lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Each user can lead only one team
  },
  members: {
    type: [teamMemberSchema],
    validate: {
      validator: function (v) {
        return v.length >= 2 && v.length <= 4;
      },
      message: 'Team must have between 2 and 4 members (including the lead).',
    },
  },
  project_title: {
    type: String,
    trim: true,
    default: '',
  },
  is_submitted: {
    type: Boolean,
    default: false,
  },
  submission_url: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Index for fast lookups
kodekurrentTeamSchema.index({ 'members.user': 1 }); // quickly find which team a user is in
kodekurrentTeamSchema.index({ team_name: 'text' }); // text search on team names

const KodekurrentTeam = mongoose.model('KodekurrentTeam', kodekurrentTeamSchema);

export default KodekurrentTeam;
