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
    receiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
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