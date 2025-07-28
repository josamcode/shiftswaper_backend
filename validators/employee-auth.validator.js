// validators/employee-auth.validator.js
const { body } = require('express-validator');

const validateEmployeeRegister = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('accountName')
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Account name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Account name can only contain letters, numbers, and underscores'),

  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['expert', 'supervisor', 'sme'])
    .withMessage('Position must be expert, supervisor, or sme'),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number (E.164 format)'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isMongoId()
    .withMessage('Please provide a valid company ID'),

  body('supervisorId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid supervisor ID')
];

const validateEmployeeLogin = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateVerifyEmployeeOTP = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),

  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
];

const validateResendOTP = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number')
];

module.exports = {
  validateEmployeeRegister,
  validateEmployeeLogin,
  validateVerifyEmployeeOTP,
  validateResendOTP
};