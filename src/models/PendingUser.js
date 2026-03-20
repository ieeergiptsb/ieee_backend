import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  userData: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '15m' // Automatically delete after 15 minutes 
  }
});

export default mongoose.model('PendingUser', pendingUserSchema);
