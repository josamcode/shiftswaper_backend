// routes/employee-auth.routes.js
const express = require('express');
const {
  registerEmployee,
  verifyEmployeeOTP,
  loginEmployee,
  resendEmployeeOTP
} = require('../controllers/employee-auth.controller');
const {
  validateEmployeeRegister,
  validateEmployeeLogin,
  validateVerifyEmployeeOTP,
  validateResendOTP
} = require('../validators/employee-auth.validator');
const { handleValidationErrors } = require('../validators/validationResult');

const router = express.Router();

// Register employee (step 1)
router.post('/register',
  validateEmployeeRegister,
  handleValidationErrors,
  registerEmployee
);

// Verify employee registration OTP (step 2)
router.post('/verify-registration-otp',
  validateVerifyEmployeeOTP,
  handleValidationErrors,
  verifyEmployeeOTP
);

// Login employee with password
router.post('/login',
  validateEmployeeLogin,
  handleValidationErrors,
  loginEmployee
);

// Resend OTP for registration
router.post('/resend-otp',
  validateResendOTP,
  handleValidationErrors,
  resendEmployeeOTP
);

module.exports = router;