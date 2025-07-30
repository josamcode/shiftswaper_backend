// validators/day-off-swap-request.validator.js
const { body, param } = require('express-validator');

const validateCreateDayOffSwapRequest = [
  body('originalDayOff')
    .notEmpty()
    .withMessage('Original day off is required')
    .isISO8601()
    .withMessage('Original day off must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Original day off must be a future date');
      }
      return true;
    }),

  body('requestedDayOff')
    .notEmpty()
    .withMessage('Requested day off is required')
    .isISO8601()
    .withMessage('Requested day off must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Requested day off must be a future date');
      }
      return true;
    }),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  body('shiftStartDate')
    .notEmpty()
    .withMessage("Shift start date is required")
    .isISO8601()
    .withMessage('Shift start date must be a valid date'),

  body('shiftEndDate')
    .if((value, { req }) => req.body.shiftStartDate)
    .notEmpty()
    .withMessage('Shift end date is required when shift start date is provided')
    .isISO8601()
    .withMessage('Shift end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.shiftStartDate);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('Shift end date must be after shift start date');
      }
      return true;
    }),

  body('overtimeStart')
    .optional()
    .isISO8601()
    .withMessage('Overtime start must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.overtimeEnd) {
        const overtimeStart = new Date(value);
        const overtimeEnd = new Date(req.body.overtimeEnd);
        const shiftEnd = req.body.shiftEndDate ? new Date(req.body.shiftEndDate) : null;

        if (shiftEnd && overtimeStart <= shiftEnd) {
          throw new Error('Overtime start must be after shift end time');
        }
        if (overtimeStart >= overtimeEnd) {
          throw new Error('Overtime start must be before overtime end');
        }
      }
      return true;
    }),

  body('overtimeEnd')
    .optional()
    .isISO8601()
    .withMessage('Overtime end must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.overtimeStart) {
        const overtimeStart = new Date(req.body.overtimeStart);
        const overtimeEnd = new Date(value);
        if (overtimeEnd <= overtimeStart) {
          throw new Error('Overtime end must be after overtime start');
        }
      }
      return true;
    })
];

const validateMatchDayOffSwapRequest = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),

  body('originalDayOff')
    .notEmpty()
    .withMessage('Your original day off is required')
    .isISO8601()
    .withMessage('Original day off must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Original day off must be a future date');
      }
      return true;
    }),

  body('shiftStartDate')
    .optional()
    .isISO8601()
    .withMessage('Shift start date must be a valid date'),

  body('shiftEndDate')
    .if((value, { req }) => req.body.shiftStartDate)
    .notEmpty()
    .withMessage('Shift end date is required when shift start date is provided')
    .isISO8601()
    .withMessage('Shift end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.shiftStartDate);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('Shift end date must be after shift start date');
      }
      return true;
    }),

  body('overtimeStart')
    .optional()
    .isISO8601()
    .withMessage('Overtime start must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.overtimeEnd) {
        const overtimeStart = new Date(value);
        const overtimeEnd = new Date(req.body.overtimeEnd);
        const shiftEnd = req.body.shiftEndDate ? new Date(req.body.shiftEndDate) : null;

        if (shiftEnd && overtimeStart <= shiftEnd) {
          throw new Error('Overtime start must be after shift end time');
        }
        if (overtimeStart >= overtimeEnd) {
          throw new Error('Overtime start must be before overtime end');
        }
      }
      return true;
    }),

  body('overtimeEnd')
    .optional()
    .isISO8601()
    .withMessage('Overtime end must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.overtimeStart) {
        const overtimeStart = new Date(req.body.overtimeStart);
        const overtimeEnd = new Date(value);
        if (overtimeEnd <= overtimeStart) {
          throw new Error('Overtime end must be after overtime start');
        }
      }
      return true;
    })
];

const validateAcceptMatch = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),

  body('matchId')
    .notEmpty()
    .withMessage('Match ID is required')
    .isMongoId()
    .withMessage('Please provide a valid match ID')
];

const validateUpdateStatus = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be approved or rejected'),

  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
];

const validateRequestIdParam = [
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID')
];

module.exports = {
  validateCreateDayOffSwapRequest,
  validateMatchDayOffSwapRequest,
  validateAcceptMatch,
  validateUpdateStatus,
  validateRequestIdParam
};