import mongoose from 'mongoose';

const bootcampUpdateSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BootcampEvent',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    short_description: { type: String, default: '', trim: true },
    link: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

bootcampUpdateSchema.index({ event: 1, createdAt: -1 });

export default mongoose.model('BootcampUpdate', bootcampUpdateSchema);
