// models/company.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value) {
          // RegEx for international phone numbers
          return /^(\+[\d]{1,3}[- ]?)?[\d- ]{4,14}$/.test(value);
        },
        message: 'Phone number must be a valid international number.',
      },
    },
    logo: {
      type: String,
      required: false, // Changed from true to false
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    lastOTPSentAt: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    }
  },
  { timestamps: true }
);

// Hash password before saving
CompanySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Compare input password with hashed password
CompanySchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP with rate limiting
CompanySchema.methods.generateOTP = function () {
  const now = new Date();

  // Check if account is locked
  if (this.lockedUntil && this.lockedUntil > now) {
    const minutesLeft = Math.ceil((this.lockedUntil - now) / (1000 * 60));
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  // Check rate limiting (3 minutes between OTPs)
  if (this.lastOTPSentAt) {
    const timeSinceLastOTP = now - this.lastOTPSentAt;
    const minTimeBetweenOTPs = 3 * 60 * 1000; // 3 minutes

    if (timeSinceLastOTP < minTimeBetweenOTPs) {
      const minutesLeft = Math.ceil((minTimeBetweenOTPs - timeSinceLastOTP) / (1000 * 60));
      throw new Error(`Please wait ${minutesLeft} minutes before requesting another OTP.`);
    }
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otp = otp;
  this.otpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  this.lastOTPSentAt = now;

  // Reset OTP attempts on new OTP generation
  this.otpAttempts = 0;

  return otp;
};

// Verify OTP with attempt tracking
CompanySchema.methods.verifyOTP = function (otp) {
  const now = new Date();

  // Check if account is locked
  if (this.lockedUntil && this.lockedUntil > now) {
    throw new Error('Account is temporarily locked due to too many failed attempts.');
  }

  // Check if OTP is expired
  if (!this.otpExpiresAt || this.otpExpiresAt <= now) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // Check OTP
  if (this.otp === otp) {
    // Success - reset tracking fields
    this.otp = undefined;
    this.otpExpiresAt = undefined;
    this.lastOTPSentAt = undefined;
    this.otpAttempts = 0;
    this.lockedUntil = undefined;
    this.isVerified = true;
    return true;
  } else {
    // Failed attempt - increment counter
    this.otpAttempts += 1;

    // Lock account after 5 failed attempts
    if (this.otpAttempts >= 5) {
      this.lockedUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes lock
      throw new Error('Too many failed attempts. Account locked for 30 minutes.');
    }

    throw new Error(`Invalid OTP. ${5 - this.otpAttempts} attempts remaining.`);
  }
};

module.exports = mongoose.model('Company', CompanySchema);