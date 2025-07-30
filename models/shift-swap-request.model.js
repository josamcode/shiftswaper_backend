// models/shift-swap-request.model.js (Relevant parts updated)
const mongoose = require('mongoose');

const ShiftSwapRequestSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
    },
    shiftStartDate: {
      type: Date,
      required: true,
    },
    shiftEndDate: {
      type: Date,
      required: true,
    },
    overtimeStart: {
      type: Date,
      required: false,
    },
    overtimeEnd: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'offers_received', 'approved', 'rejected'],
      default: 'pending',
    },
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    receiverUserId: { // This can potentially be removed or repurposed if not tracking a single "taker"
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    firstSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    secondSupervisorId: { // This might need adjustment if multiple second supervisors are involved
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    statusEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Enhanced negotiation history to track offers
    negotiationHistory: [{
      offeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
      },
      shiftStartDate: Date,
      shiftEndDate: Date,
      overtimeStart: Date,
      overtimeEnd: Date,
      offeredAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['offered', 'accepted', 'rejected'],
        default: 'offered'
      },
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShiftSwapRequest', ShiftSwapRequestSchema);

/**
 * ShiftSwapRequest Schema Documentation
 *
 * Business Rules:
 * 
 * Creation:
 * - Any employee can create a shift swap request within their company.
 * - The following fields must be extracted from the token:
 *     - companyId, requesterUserId, firstSupervisorId.
 * - Requests must be created at least **15 minutes** before the shift starts.
 * - A requester **cannot** create more than one request for the same shift.
 *
 * Updates (Before Acceptance):
 * - The requester can edit or delete the request **only if**:
 *     - receiverUserId and secondSupervisorId are still `null`.
 *
 * Acceptance by Second Employee:
 * - The second employee accepts by sending a `PUT` request to `/get-the-shift`.
 * - The system will:
 *     - Set `receiverUserId` to the second employee’s ID (from token).
 *     - Set `secondSupervisorId` to the supervisor of the second employee (from token).
 * - and the receiver employee edit the second shift start and end date
 * - If the shift's start time has already passed, the request **cannot be accepted**.
 * - The second employee **can only** set their own second `overtimeStart` and `overtimeEnd` when accepting the request.
 *     - They **cannot** modify the overtime values entered by the requester.
 *
 * Post Acceptance:
 * - After the second employee accepts, **no further edits** are allowed by either party.
 * - An email is sent to:
 *     - The requester.
 *     - Both supervisors.
 *
 * Approval / Rejection:
 * - Either the first or second supervisor can update the request status (`approved` or `rejected`).
 * - The status can only be updated **if the current status is still `pending`**.
 *     - Prevents multiple supervisors from trying to approve or reject the same request more than once.
 * - When status is updated:
 *     - `statusEditedBy` is set to the supervisor who made the decision.
 *     - Emails are sent to **both employees**.
 *
 * Additional Rules:
 * - All employees and supervisors involved **must** belong to the same `companyId`.
 * - If a request is rejected, the same or different employees can create a new swap request for the same shift.
 */