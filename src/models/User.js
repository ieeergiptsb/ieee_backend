import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone_number: {
    type: String,
    required: true,
    trim: true,
  },
  college: {
    type: String,
    required: true,
    trim: true,
  },
  branch: {
    type: String,
    required: true,
    enum: ['CSE', 'CSD', 'ECE', 'EV', 'MnC', 'IT', 'Mechanical', 'Chemical', 'Petroleum', 'Civil', 'Biotech', 'Other'],
  },
  year: {
    type: String,
    required: true,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  },
  roll_no: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false, // Don't return password by default
  },
  membership_type: {
    type: String,
    required: true,
    enum: ['ieee_member', 'non_member'],
  },
  membership_code: {
    type: String,
    default: null,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  is_email_verified: {
    type: Boolean,
    default: false,
  },
  otp_code: {
    type: String,
    default: null,
  },
  otp_expires_at: {
    type: Date,
    default: null,
  },
  profile_image_url: {
    type: String,
    default: null,
  },
  designation: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  achievements: {
    type: String,
    default: '',
  },
  linkedin_url: {
    type: String,
    default: '',
  },
  github_url: {
    type: String,
    default: '',
  },
  instagram_url: {
    type: String,
    default: '',
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp_code = otp;
  this.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(otp) {
  if (!this.otp_code || !this.otp_expires_at) {
    return false;
  }
  
  if (this.otp_expires_at < new Date()) {
    return false; // OTP expired
  }
  
  return this.otp_code === otp;
};

// Remove sensitive data from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp_code;
  delete obj.otp_expires_at;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;



