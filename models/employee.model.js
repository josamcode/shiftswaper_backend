// models/employee.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
      enum: ["expert", "supervisor", "sme"]
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee', // Self-reference for supervisor
      required: false,
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
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
EmployeeSchema.pre('save', async function (next) {
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
EmployeeSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP with rate limiting
EmployeeSchema.methods.generateOTP = function () {
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
EmployeeSchema.methods.verifyOTP = function (otp) {
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

module.exports = mongoose.model('Employee', EmployeeSchema);