// /backend/models/User.js - Update the user model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// User roles enum
const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  // Add this to your User model schema
stripeCustomerId: {
  type: String
},
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
    // Add these new fields for OTP
    loginOtp: String,
    loginOtpExpires: Date,
    
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role, verified: this.emailVerified },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '7d' }
  );
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  // Create token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Set expiration (24 hours)
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  // Create token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expiration (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};


userSchema.methods.generateLoginOTP = function() {
  // Generate a 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash the OTP before storing
  this.loginOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  // Set OTP expiration (10 minutes)
  this.loginOtpExpires = Date.now() + 10 * 60 * 1000;
  
  return otp;
};

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  UserRole
};