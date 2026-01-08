import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  ip_address: {
    type: String,
    required: true,
    trim: true,
  },
  user_agent: {
    type: String,
    default: '',
  },
  page_visited: {
    type: String,
    default: '/',
  },
  referrer: {
    type: String,
    default: '',
  },
  session_id: {
    type: String,
    default: '',
  },
  is_unique: {
    type: Boolean,
    default: true,
  },
  visited_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
visitorSchema.index({ visited_at: -1 });
visitorSchema.index({ ip_address: 1, visited_at: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

export default Visitor;


