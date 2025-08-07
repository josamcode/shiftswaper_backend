// routes/employee-request.routes.js
const express = require('express');
const {
  submitEmployeeRequest,
  verifyRequestOTP,
  getCompanyRequests,
  getAllRequests,
  processEmployeeRequest,
  loginEmployee,
  resendRequestOTP,
  forgotPassword,
  verifyResetPasswordOTP,
  resetPassword,
  resendResetPasswordOTP
} = require('../controllers/employee-request.controller');

const {
  validateEmployeeRequest,
  validateRequestAction,
  validateVerifyRequestOTP,
  validateResendRequestOTP,
  validateEmployeeLogin,
  validateForgotPassword,
  validateVerifyResetPasswordOTP,
  validateResetPassword,
  validateResendResetPasswordOTP
} = require('../validators/employee-request.validator');

const { handleValidationErrors } = require('../validators/validationResult');
const { authenticateCompany, authenticateEmployee } = require('../middleware/auth.middleware');

const router = express.Router();

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

router.post('/resend-request-otp',
  validateResendRequestOTP,
  handleValidationErrors,
  resendRequestOTP
);

router.post('/login',
  validateEmployeeLogin,
  handleValidationErrors,
  loginEmployee
);

router.post('/forgot-password',
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword
);

router.post('/verify-reset-password-otp',
  validateVerifyResetPasswordOTP,
  handleValidationErrors,
  verifyResetPasswordOTP
);

router.post('/reset-password',
  validateResetPassword,
  handleValidationErrors,
  resetPassword
);

router.post('/resend-reset-password-otp',
  validateResendResetPasswordOTP,
  handleValidationErrors,
  resendResetPasswordOTP
);

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