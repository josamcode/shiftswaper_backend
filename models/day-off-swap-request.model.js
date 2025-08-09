// models/day-off-swap-request.model.js
const mongoose = require('mongoose');

const DayOffSwapRequestSchema = new mongoose.Schema(
  {
    // Requester's details
    originalDayOff: {
      type: Date,
      required: true,
    },
    requestedDayOff: {
      type: Date,
      required: true,
    },
    // Optional shift details for the requested day
    shiftStartDate: {
      type: Date,
      required: false,
    },
    shiftEndDate: {
      type: Date,
      required: false,
    },
    overtimeStart: {
      type: Date,
      required: false,
    },
    overtimeEnd: {
      type: Date,
      required: false,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'matched', 'approved', 'rejected'],
      default: 'pending',
    },
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // Receiver details (filled when matched)
    receiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    receiverOriginalDayOff: {
      type: Date,
      required: false,
    },
    // Optional shift details for the receiver's original day
    receiverShiftStartDate: {
      type: Date,
      required: false,
    },
    receiverShiftEndDate: {
      type: Date,
      required: false,
    },
    receiverOvertimeStart: {
      type: Date,
      required: false,
    },
    receiverOvertimeEnd: {
      type: Date,
      required: false,
    },
    firstSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    secondSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    userPosition: {
      type: String,
      required: true,
      enum: ["expert", "supervisor", "sme"]
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
    // Matching history
    matches: [{
      matchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
      },
      originalDayOff: Date,
      shiftStartDate: Date,
      shiftEndDate: Date,
      overtimeStart: Date,
      overtimeEnd: Date,
      matchedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['proposed', 'accepted', 'rejected'],
        default: 'proposed'
      }
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('DayOffSwapRequest', DayOffSwapRequestSchema);