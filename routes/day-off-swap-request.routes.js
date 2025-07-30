// routes/day-off-swap-request.routes.js
const express = require('express');
const {
  createDayOffSwapRequest,
  getDayOffSwapRequests,
  getDayOffSwapRequestById,
  matchDayOffSwapRequest,
  acceptMatch,
  updateRequestStatus,
  deleteDayOffSwapRequest
} = require('../controllers/day-off-swap-request.controller');
const {
  validateCreateDayOffSwapRequest,
  validateMatchDayOffSwapRequest,
  validateAcceptMatch,
  validateUpdateStatus,
  validateRequestIdParam
} = require('../validators/day-off-swap-request.validator');
const { handleValidationErrors } = require('../validators/validationResult');
const { authenticateEmployee } = require('../middleware/auth.middleware');

const router = express.Router();

// Protected routes - Employee authentication required
router.use(authenticateEmployee);

// Create day off swap request
router.post('/',
  validateCreateDayOffSwapRequest,
  handleValidationErrors,
  createDayOffSwapRequest
);

// Get day off swap requests (with filtering)
router.get('/',
  getDayOffSwapRequests
);

// Get day off swap request by ID
router.get('/get/:requestId',
  validateRequestIdParam,
  handleValidationErrors,
  getDayOffSwapRequestById
);

// Delete day off swap request (before acceptance)
router.delete('/delete/:requestId',
  validateRequestIdParam,
  handleValidationErrors,
  deleteDayOffSwapRequest
);

// Match day off swap request (propose a swap)
router.post('/match',
  validateMatchDayOffSwapRequest,
  handleValidationErrors,
  matchDayOffSwapRequest
);

// Accept a specific match (requester chooses one)
router.post('/accept-match',
  validateAcceptMatch,
  handleValidationErrors,
  acceptMatch
);

// Update request status (approve/reject by supervisors)
router.put('/status',
  validateUpdateStatus,
  handleValidationErrors,
  updateRequestStatus
);

module.exports = router;