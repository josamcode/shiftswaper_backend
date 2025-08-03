// models/employee-request.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator'); // <-- Add this

const EmployeeRequestSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => {
          // Use validator.js isMobilePhone with multiple locales
          return validator.isMobilePhone(v, 'any');
        },
        message: (props) => `${props.value} is not a valid international phone number.`,
      },
    },
    position: {
      type: String,
      required: true,
      enum: ['expert', 'supervisor', 'sme', "moderator"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    rejectedAt: {
      type: Date,
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
  },
  { timestamps: true }
);

// Hash password before saving
EmployeeRequestSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Generate OTP with rate limiting
EmployeeRequestSchema.methods.generateOTP = function () {
  const now = new Date();

  if (this.lockedUntil && this.lockedUntil > now) {
    const minutesLeft = Math.ceil((this.lockedUntil - now) / (1000 * 60));
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  if (this.lastOTPSentAt) {
    const timeSinceLastOTP = now - this.lastOTPSentAt;
    const minTimeBetweenOTPs = 3 * 60 * 1000; // 3 minutes
    if (timeSinceLastOTP < minTimeBetweenOTPs) {
      const minutesLeft = Math.ceil((minTimeBetweenOTPs - timeSinceLastOTP) / (1000 * 60));
      throw new Error(`Please wait ${minutesLeft} minutes before requesting another OTP.`);
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  this.lastOTPSentAt = now;
  this.otpAttempts = 0;

  return otp;
};

// Verify OTP
EmployeeRequestSchema.methods.verifyOTP = function (otp) {
  const now = new Date();

  if (this.lockedUntil && this.lockedUntil > now) {
    throw new Error('Account is temporarily locked due to too many failed attempts.');
  }

  if (!this.otpExpiresAt || this.otpExpiresAt <= now) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (this.otp === otp) {
    this.otp = undefined;
    this.otpExpiresAt = undefined;
    this.lastOTPSentAt = undefined;
    this.otpAttempts = 0;
    this.lockedUntil = undefined;
    return true;
  } else {
    this.otpAttempts += 1;
    if (this.otpAttempts >= 5) {
      this.lockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
      throw new Error('Too many failed attempts. Account locked for 30 minutes.');
    }
    throw new Error(`Invalid OTP. ${5 - this.otpAttempts} attempts remaining.`);
  }
};

module.exports = mongoose.model('EmployeeRequest', EmployeeRequestSchema);