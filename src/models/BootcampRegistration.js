import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, trim: true },
    roll_no: { type: String, trim: true },
  },
  { _id: false }
);

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
    team_name: { type: String, trim: true },
    team_size: { type: Number, default: 1 },
    members: [memberSchema],
    registered_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

bootcampRegistrationSchema.index({ user_id: 1, event: 1 }, { unique: true });

export default mongoose.model('BootcampRegistration', bootcampRegistrationSchema);
