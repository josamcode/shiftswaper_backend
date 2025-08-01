// routes/shift-swap-request.routes.js
const express = require('express');
const {
  createShiftSwapRequest,
  getShiftSwapRequests,
  getShiftSwapRequestById,
  updateShiftSwapRequest,
  deleteShiftSwapRequest,
  getTheShift,
  counterOffer,
  acceptCounterOffer,
  updateRequestStatus,
  acceptSpecificOffer,
  getMyShiftSwapRequests
} = require('../controllers/shift-swap-request.controller');
const {
  validateCreateShiftSwapRequest,
  validateAcceptCounterOffer,
  validateUpdateStatus,
  validateRequestIdParam,
  validateAcceptSpecificOffer,
  validateCounterOffer
} = require('../validators/shift-swap-request.validator');
const { handleValidationErrors } = require('../validators/validationResult');
const { authenticateEmployee } = require('../middleware/auth.middleware');

const router = express.Router();

// Protected routes - Employee authentication required
router.use(authenticateEmployee);

// Create shift swap request
router.post('/',
  validateCreateShiftSwapRequest,
  handleValidationErrors,
  createShiftSwapRequest
);

// Get shift swap requests (with filtering)
router.get('/',
  getShiftSwapRequests
);

// Get shift swap requests by me
router.get('/my',
  getMyShiftSwapRequests
);

// Get shift swap request by ID
router.get('/get/:requestId',
  validateRequestIdParam,
  handleValidationErrors,
  getShiftSwapRequestById
);

// Update shift swap request (before acceptance)
router.put('/update/:requestId',
  validateRequestIdParam,
  handleValidationErrors,
  updateShiftSwapRequest
);

// Delete shift swap request (before acceptance)
router.delete('/delete/:requestId',
  validateRequestIdParam,
  handleValidationErrors,
  deleteShiftSwapRequest
);

// Get the shift (accept request by second employee)
router.post('/get-the-shift',
  // Using existing validation for get-the-shift
  handleValidationErrors,
  getTheShift
);

// Counter offer (receiver proposes their own shift)
router.post('/counter-offer',
  validateCounterOffer, // Assuming you have this validator
  handleValidationErrors,
  counterOffer
);

// Accept a specific counter offer (requester chooses one)
router.post('/accept-specific-offer', // New endpoint
  validateAcceptSpecificOffer, // New validator
  handleValidationErrors,
  acceptSpecificOffer
);

// Update request status (approve/reject by supervisors)
router.put('/status',
  validateUpdateStatus,
  handleValidationErrors,
  updateRequestStatus
);

module.exports = router;
