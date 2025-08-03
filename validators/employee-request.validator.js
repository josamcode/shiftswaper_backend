// validators/employee-request.validator.js
const { body, oneOf } = require('express-validator');

const validateEmployeeRequest = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('accountName')
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Account name must be between 3 and 50 characters'),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['expert', 'supervisor', 'sme', "moderator"])
    .withMessage('Position must be expert, supervisor, or sme'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isMongoId()
    .withMessage('Please provide a valid company ID')
];

const validateRequestAction = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),

  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be approve or reject'),

  body('supervisorId')
    .if((value, { req }) => req.body.action === 'approve')
    .optional({ nullable: true }) // Allow it to be missing or null
    .isMongoId()
    .withMessage('Please provide a valid supervisor ID'),

  body('rejectionReason')
    .if((value, { req }) => req.body.action === 'reject')
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting')
    .isLength({ min: 5, max: 500 })
    .withMessage('Rejection reason must be between 5 and 500 characters')
];

const validateVerifyRequestOTP = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

const validateResendRequestOTP = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const validateEmployeeLogin = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Update exports
module.exports = {
  validateEmployeeRequest,
  validateRequestAction,
  validateVerifyRequestOTP,
  validateResendRequestOTP,
  validateEmployeeLogin
};
