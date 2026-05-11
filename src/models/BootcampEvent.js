import mongoose from 'mongoose';

const bootcampEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, default: '', trim: true },
    short_description: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    roadmap: { type: String, default: '' },
    highlights: [{ type: String, trim: true }],
    topics: [{ type: String, trim: true }],
    duration: { type: String, default: '' },
    category: { type: String, default: 'bootcamp', trim: true },
    banner_url: { type: String, default: null },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bootcampEventSchema.index({ is_active: 1, slug: 1 });

export default mongoose.model('BootcampEvent', bootcampEventSchema);
