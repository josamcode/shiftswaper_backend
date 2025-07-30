// routes/employee-request.routes.js
const express = require('express');
const {
  submitEmployeeRequest,
  verifyRequestOTP,
  getCompanyRequests,
  getAllRequests,
  processEmployeeRequest,
  loginEmployee,
  resendRequestOTP
} = require('../controllers/employee-request.controller');
const {
  validateEmployeeRequest,
  validateRequestAction,
  validateVerifyRequestOTP,
  validateResendRequestOTP,
  validateEmployeeLogin
} = require('../validators/employee-request.validator');
const { handleValidationErrors } = require('../validators/validationResult');
const { authenticateCompany, authenticateEmployee } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/submit-request',
  validateEmployeeRequest,
  handleValidationErrors,
  submitEmployeeRequest
);

router.post('/verify-request-otp',
  validateVerifyRequestOTP,
  handleValidationErrors,
  verifyRequestOTP
);

router.post('/login',
  validateEmployeeLogin,
  handleValidationErrors,
  loginEmployee
);

router.post('/resend-request-otp',
  validateResendRequestOTP,
  handleValidationErrors,
  resendRequestOTP
);

// Protected routes - Company authentication
router.get('/company/requests',
  authenticateCompany,
  getCompanyRequests
);

router.get('/company/all-requests',
  authenticateCompany,
  getAllRequests
);

router.post('/process',
  authenticateCompany,
  validateRequestAction,
  handleValidationErrors,
  processEmployeeRequest
);

module.exports = router;