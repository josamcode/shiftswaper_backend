// validators/shift-swap-request.validator.js
const { body } = require('express-validator');

const validateShiftSwapRequest = [
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
      const date = new Date(value);
      return date > new Date();
    })
    .withMessage('Shift start date must be a future date'),

  body('shiftEndDate')
    .notEmpty()
    .withMessage('Shift end date is required')
    .isISO8601()
    .withMessage('Shift end date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.shiftStartDate);
      const endDate = new Date(value);
      return endDate > startDate;
    })
    .withMessage('Shift end date must be after shift start date'),

  body('overtimeStart')
    .optional()
    .isISO8601()
    .withMessage('Overtime start must be a valid date')
    .custom((value, { req }) => {
      if (req.body.overtimeEnd) {
        const overtimeStart = new Date(value);
        const overtimeEnd = new Date(req.body.overtimeEnd);
        return overtimeStart < overtimeEnd;
      }
      return true;
    })
    .withMessage('Overtime start must be before overtime end'),

  body('overtimeEnd')
    .optional()
    .isISO8601()
    .withMessage('Overtime end must be a valid date'),

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

  body('receiverUserId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid receiver user ID'),

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
  validateShiftSwapRequest
};