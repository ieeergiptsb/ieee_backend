import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const eventRegistrationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event_name: {
    type: String,
    required: true,
    trim: true,
  },
  event_slug: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  team_name: {
    type: String,
    required: true,
    trim: true,
  },
  team_size: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  members: {
    type: [memberSchema],
    required: true,
    validate: {
      validator: function(members) {
        return members.length === this.team_size;
      },
      message: 'Number of members must match team size',
    },
  },
  feedback: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
  },
  registration_date: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
eventRegistrationSchema.index({ user_id: 1, event_slug: 1 });
eventRegistrationSchema.index({ event_slug: 1, status: 1 });

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);

export default EventRegistration;










