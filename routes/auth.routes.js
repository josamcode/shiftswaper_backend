const express = require('express');
const router = express.Router();
const upload = require('../config/multer.config');
const multerErrorHandler = require('../middleware/multerErrorHandler'); // Add this

// routes/auth.routes.js
const {
  registerCompany,
  verifyOTP,
  loginCompany,
  resendOTP,
  getAllCompanies
} = require('../controllers/auth.controller');
const {
  validateRegister,
  validateLogin,
  validateVerifyOTP
} = require('../validators/auth.validator');
const { handleValidationErrors } = require('../validators/validationResult');

// Register company (step 1)
// The upload middleware handles the file upload and populates req.file and req.body
router.post('/register',
  upload.single('logo'), // This middleware processes the multipart/form-data
  multerErrorHandler,
  validateRegister,      // Uncomment if you want validation
  handleValidationErrors, // Uncomment if you want validation
  registerCompany        // Your controller can now access req.file and req.body directly
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
  handleValidationErrors,
  resendOTP
);

// Get all companies (public route)
router.get('/companies', getAllCompanies);

module.exports = router;