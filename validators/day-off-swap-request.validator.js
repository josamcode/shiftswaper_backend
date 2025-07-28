// validators/day-off-swap-request.validator.js
const { body } = require('express-validator');

const validateDayOffSwapRequest = [
  body('originalDayOff')
    .notEmpty()
    .withMessage('Original day off is required')
    .isISO8601()
    .withMessage('Original day off must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      return date > new Date();
    })
    .withMessage('Original day off must be a future date'),

  body('requestedDayOff')
    .notEmpty()
    .withMessage('Requested day off is required')
    .isISO8601()
    .withMessage('Requested day off must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      return date > new Date();
    })
    .withMessage('Requested day off must be a future date'),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  body('requesterUserId')
    .notEmpty()
    .withMessage('Requester user ID is required')
    .isMongoId()
    .withMessage('Please provide a valid requester user ID'),

  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isMongoId()
    .withMessage('Please provide a valid company ID'),

  body('swapWithId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid swap with ID'),

  body('firstSupervisorId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid first supervisor ID'),

  body('secondSupervisorId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid second supervisor ID')
];

module.exports = {
  validateDayOffSwapRequest
};