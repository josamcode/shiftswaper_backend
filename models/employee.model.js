// models/employee.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (v) {
          return validator.isEmail(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    position: {
      type: String,
      required: true,
      enum: ["expert", "supervisor", "sme", "moderator"]
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
      ref: 'Employee',
      required: false,
    },
    employeeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeRequest',
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    // OTP fields for password reset
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordOTPExpiresAt: {
      type: Date,
    },
    lastResetOTPSentAt: {
      type: Date,
      default: null,
    },
    resetOTPAttempts: {
      type: Number,
      default: 0,
    },
    resetLockedUntil: {
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

// Hash password before saving (only if password is modified and not already hashed)
EmployeeSchema.pre('save', async function (next) {
  // Skip hashing if password is not modified
  if (!this.isModified('password')) return next();

  // Skip hashing if it's already hashed (for employee creation from request)
  if (this.$locals && this.$locals.passwordAlreadyHashed) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Generate OTP for password reset with rate limiting
EmployeeSchema.methods.generateResetPasswordOTP = function () {
  const now = new Date();

  // Check if account is locked
  if (this.resetLockedUntil && this.resetLockedUntil > now) {
    const minutesLeft = Math.ceil((this.resetLockedUntil - now) / (1000 * 60));
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  // Check if minimum time has passed since last OTP
  if (this.lastResetOTPSentAt) {
    const timeSinceLastOTP = now - this.lastResetOTPSentAt;
    const minTimeBetweenOTPs = 3 * 60 * 1000; // 3 minutes
    if (timeSinceLastOTP < minTimeBetweenOTPs) {
      const minutesLeft = Math.ceil((minTimeBetweenOTPs - timeSinceLastOTP) / (1000 * 60));
      throw new Error(`Please wait ${minutesLeft} minutes before requesting another OTP.`);
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordOTP = otp;
  this.resetPasswordOTPExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  this.lastResetOTPSentAt = now;
  this.resetOTPAttempts = 0;

  return otp;
};

// Verify OTP for password reset
EmployeeSchema.methods.verifyResetPasswordOTP = function (otp) {
  const now = new Date();

  // Check if account is locked
  if (this.resetLockedUntil && this.resetLockedUntil > now) {
    throw new Error('Account is temporarily locked due to too many failed attempts.');
  }

  // Check if OTP has expired
  if (!this.resetPasswordOTPExpiresAt || this.resetPasswordOTPExpiresAt <= now) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // Check if OTP exists
  if (!this.resetPasswordOTP) {
    throw new Error('No OTP found. Please request a new one.');
  }

  if (this.resetPasswordOTP === otp) {
    // OTP is correct - clear OTP fields
    this.resetPasswordOTP = undefined;
    this.resetPasswordOTPExpiresAt = undefined;
    this.lastResetOTPSentAt = undefined;
    this.resetOTPAttempts = 0;
    this.resetLockedUntil = undefined;
    return true;
  } else {
    // OTP is incorrect - increment attempts
    this.resetOTPAttempts += 1;
    if (this.resetOTPAttempts >= 5) {
      this.resetLockedUntil = new Date(now.getTime() + 30 * 60 * 1000); // Lock for 30 minutes
      throw new Error('Too many failed attempts. Account locked for 30 minutes.');
    }
    throw new Error(`Invalid OTP. ${5 - this.resetOTPAttempts} attempts remaining.`);
  }
};

// Clear reset password OTP fields
EmployeeSchema.methods.clearResetPasswordOTP = function () {
  this.resetPasswordOTP = undefined;
  this.resetPasswordOTPExpiresAt = undefined;
  this.lastResetOTPSentAt = undefined;
  this.resetOTPAttempts = 0;
  this.resetLockedUntil = undefined;
};

EmployeeSchema.methods.toJSON = function () {
  const employee = this.toObject();
  delete employee.password;
  delete employee.resetPasswordOTP;
  delete employee.resetPasswordOTPExpiresAt;
  delete employee.lastResetOTPSentAt;
  delete employee.resetOTPAttempts;
  delete employee.resetLockedUntil;
  return employee;
};

EmployeeSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);