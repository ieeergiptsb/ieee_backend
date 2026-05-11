import mongoose from 'mongoose';

const bootcampRegistrationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BootcampEvent',
      required: true,
      index: true,
    },
    registered_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

bootcampRegistrationSchema.index({ user_id: 1, event: 1 }, { unique: true });

export default mongoose.model('BootcampRegistration', bootcampRegistrationSchema);
