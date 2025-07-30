const express = require('express');
const router = express.Router();

// routes/auth.routes.js
const {
  registerCompany,
  verifyOTP,
  loginCompany,
  resendOTP
} = require('../controllers/auth.controller');
const {
  validateRegister,
  validateLogin,
  validateVerifyOTP
} = require('../validators/auth.validator');
const { handleValidationErrors } = require('../validators/validationResult');

// Register company (step 1)
router.post('/register',
  validateRegister,
  handleValidationErrors,
  registerCompany
);

// Verify OTP (step 2)
router.post('/verify-otp',
  validateVerifyOTP,
  handleValidationErrors,
  verifyOTP
);

// Login company
router.post('/login',
  validateLogin,
  handleValidationErrors,
  loginCompany
);

// Resend OTP
router.post('/resend-otp',
  validateLogin,
  handleValidationErrors,
  resendOTP
);

module.exports = router;