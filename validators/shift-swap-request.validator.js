// validators/shift-swap-request.validator.js
const { body, param, query } = require('express-validator');

const validateCreateShiftSwapRequest = [
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  body('shiftStartDate')
    .notEmpty()
    .withMessage('Shift start date is required')
    .isISO8601()
    .withMessage('Shift start date must be a valid date')
    .custom((value) => {
      const shiftStart = new Date(value);
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      if (shiftStart <= fifteenMinutesFromNow) {
        throw new Error('Shift must start at least 15 minutes from now');
      }
      return true;
    }),

  body('shiftEndDate')
    .notEmpty()
    .withMessage('Shift end date is required')
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
        const shiftEnd = new Date(req.body.shiftEndDate);

        if (overtimeStart <= shiftEnd) {
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

const validateCounterOffer = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),

  body('shiftStartDate')
    .notEmpty()
    .withMessage('Shift start date is required')
    .isISO8601()
    .withMessage('Shift start date must be a valid date')
    .custom((value) => {
      const shiftStart = new Date(value);
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      if (shiftStart <= fifteenMinutesFromNow) {
        throw new Error('Shift must start at least 15 minutes from now');
      }
      return true;
    })
    .custom(async (value, { req }) => {
      return true;
    }),

  body('shiftEndDate')
    .notEmpty()
    .withMessage('Shift end date is required')
    .isISO8601()
    .withMessage('Shift end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.shiftStartDate);
      const endDate = new Date(value);

      if (endDate <= startDate) {
        throw new Error('Shift end date must be after shift start date');
      }
      return true;
    })
    .custom(async (value, { req }) => {
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
        const shiftEnd = new Date(req.body.shiftEndDate);

        if (overtimeStart <= shiftEnd) {
          throw new Error('Overtime start must be after shift end time');
        }
        if (overtimeStart >= overtimeEnd) {
          throw new Error('Overtime start must be before overtime end');
        }
      }
      return true;
    })
    .custom(async (value, { req }) => {
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
    .custom(async (value, { req }) => {
      return true;
    })
];

const validateAcceptSpecificOffer = [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Please provide a valid request ID'),
  body('offerId') // New field
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Please provide a valid offer ID')
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
  validateCreateShiftSwapRequest,
  validateCounterOffer,
  validateAcceptSpecificOffer,
  validateUpdateStatus,
  validateRequestIdParam
};