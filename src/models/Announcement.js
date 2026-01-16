import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  image_url: {
    type: String,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at before saving
announcementSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
