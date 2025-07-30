// controllers/shift-swap-request.controller.js
const ShiftSwapRequest = require('../models/shift-swap-request.model');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const EmailService = require('../services/email.service');

// Create shift swap request
const createShiftSwapRequest = async (req, res) => {
  try {
    const {
      reason,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd
    } = req.body;

    const requesterUserId = req.employeeId;
    const companyId = req.employee.companyId;
    const firstSupervisorId = req.employee.supervisorId;

    // Validate company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Validate supervisor exists (if provided)
    if (firstSupervisorId) {
      const supervisor = await Employee.findById(firstSupervisorId);
      if (!supervisor) {
        return res.status(404).json({
          success: false,
          message: 'Supervisor not found'
        });
      }
      if (supervisor.companyId.toString() !== companyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor must belong to the same company'
        });
      }
    }

    // Check if requester already has a request for this shift
    const existingRequest = await ShiftSwapRequest.findOne({
      requesterUserId,
      shiftStartDate,
      shiftEndDate,
      companyId
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a request for this shift'
      });
    }

    // Create shift swap request
    const shiftSwapRequest = new ShiftSwapRequest({
      reason,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd,
      requesterUserId,
      companyId,
      firstSupervisorId
    });

    await shiftSwapRequest.save();

    // Populate references for response
    await shiftSwapRequest.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Shift swap request created successfully',
      data: {
        shiftSwapRequest
      }
    });

  } catch (error) {
    console.error('Create shift swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get shift swap requests (with filtering)
const getShiftSwapRequests = async (req, res) => {
  try {
    const { status, requesterId, receiverId } = req.query;
    const employeeId = req.employeeId;
    const companyId = req.employee.companyId;

    let filter = { companyId };

    // Apply filters
    if (status) {
      filter.status = status;
    }

    if (requesterId) {
      filter.requesterUserId = requesterId;
    }

    if (receiverId) {
      filter.receiverUserId = receiverId;
    }

    // If not admin/supervisor, only show requests where employee is involved
    const isSupervisor = req.employee.position === 'supervisor' || req.employee.position === 'sme';

    if (!isSupervisor) {
      filter.$or = [
        { requesterUserId: employeeId },
        { receiverUserId: employeeId },
        { firstSupervisorId: employeeId },
        { secondSupervisorId: employeeId }
      ];
    }

    const requests = await ShiftSwapRequest.find(filter)
      .populate([
        { path: 'requesterUserId', select: 'fullName accountName email position' },
        { path: 'receiverUserId', select: 'fullName accountName email position' },
        { path: 'firstSupervisorId', select: 'fullName accountName email position' },
        { path: 'secondSupervisorId', select: 'fullName accountName email position' },
        { path: 'statusEditedBy', select: 'fullName accountName email position' },
        { path: 'companyId', select: 'name' },
        { path: 'negotiationHistory.offeredBy', select: 'fullName accountName email position' }
      ])
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        requests
      }
    });

  } catch (error) {
    console.error('Get shift swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get shift swap request by ID
const getShiftSwapRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.employeeId;
    const companyId = req.employee.companyId;

    const request = await ShiftSwapRequest.findOne({
      _id: requestId,
      companyId
    }).populate([
      { path: 'requesterUserId', select: 'fullName accountName email position' },
      { path: 'receiverUserId', select: 'fullName accountName email position' },
      { path: 'firstSupervisorId', select: 'fullName accountName email position' },
      { path: 'secondSupervisorId', select: 'fullName accountName email position' },
      { path: 'statusEditedBy', select: 'fullName accountName email position' },
      { path: 'companyId', select: 'name' },
      { path: 'negotiationHistory.offeredBy', select: 'fullName accountName email position' }
    ]);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if employee has permission to view this request
    const isSupervisor = req.employee.position === 'supervisor' || req.employee.position === 'sme';
    const isInvolved =
      request.requesterUserId._id.toString() === employeeId.toString() ||
      (request.receiverUserId && request.receiverUserId._id.toString() === employeeId.toString()) ||
      (request.firstSupervisorId && request.firstSupervisorId._id.toString() === employeeId.toString()) ||
      (request.secondSupervisorId && request.secondSupervisorId._id.toString() === employeeId.toString());

    if (!isSupervisor && !isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this request.'
      });
    }

    res.json({
      success: true,
      data: {
        request
      }
    });

  } catch (error) {
    console.error('Get shift swap request by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update shift swap request (before acceptance)
const updateShiftSwapRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.employeeId;
    const updateData = req.body;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if requester is updating their own request
    if (request.requesterUserId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own requests.'
      });
    }

    // Check if request can still be updated (before acceptance)
    if (request.receiverUserId || request.secondSupervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be updated after it has been accepted by another employee.'
      });
    }

    // Check if shift has already started
    const now = new Date();
    const shiftStart = new Date(request.shiftStartDate);
    if (shiftStart <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update request after shift has started.'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'reason', 'shiftStartDate', 'shiftEndDate',
      'overtimeStart', 'overtimeEnd'
    ];

    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        request[field] = updateData[field];
      }
    });

    // Validate shift timing
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    if (new Date(request.shiftStartDate) <= fifteenMinutesFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Shift must start at least 15 minutes from now'
      });
    }

    if (new Date(request.shiftEndDate) <= new Date(request.shiftStartDate)) {
      return res.status(400).json({
        success: false,
        message: 'Shift end date must be after shift start date'
      });
    }

    await request.save();

    // Populate references for response
    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' }
    ]);

    res.json({
      success: true,
      message: 'Shift swap request updated successfully',
      data: {
        shiftSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Update shift swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete shift swap request (before acceptance)
const deleteShiftSwapRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.employeeId;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if requester is deleting their own request
    if (request.requesterUserId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own requests.'
      });
    }

    // Check if request can still be deleted (before acceptance)
    if (request.receiverUserId || request.secondSupervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be deleted after it has been accepted by another employee.'
      });
    }

    // Check if shift has already started
    const now = new Date();
    const shiftStart = new Date(request.shiftStartDate);
    if (shiftStart <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete request after shift has started.'
      });
    }

    await ShiftSwapRequest.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Shift swap request deleted successfully'
    });

  } catch (error) {
    console.error('Delete shift swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get the shift (accept request by second employee)
const getTheShift = async (req, res) => {
  try {
    const { requestId } = req.body;
    const receiverUserId = req.employeeId;
    const companyId = req.employee.companyId;
    const secondSupervisorId = req.employee.supervisorId;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if request belongs to same company
    if (request.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Check if shift has already started
    const now = new Date();
    const shiftStart = new Date(request.shiftStartDate);
    if (shiftStart <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept request after shift has started.'
      });
    }

    // Check if request has already been accepted
    if (request.receiverUserId || request.secondSupervisorId) {
      return res.status(400).json({
        success: false,
        message: 'This request has already been accepted by another employee.'
      });
    }

    // Validate supervisor exists (if provided)
    if (secondSupervisorId) {
      const supervisor = await Employee.findById(secondSupervisorId);
      if (!supervisor) {
        return res.status(404).json({
          success: false,
          message: 'Supervisor not found'
        });
      }
      if (supervisor.companyId.toString() !== companyId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor must belong to the same company'
        });
      }
    }

    // Update request with receiver and second supervisor
    request.receiverUserId = receiverUserId;
    request.secondSupervisorId = secondSupervisorId;

    await request.save();

    // Populate references for response
    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'receiverUserId', select: 'fullName accountName email' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' },
      { path: 'secondSupervisorId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' }
    ]);

    res.json({
      success: true,
      message: 'You have successfully accepted this shift swap request',
      data: {
        shiftSwapRequest: request
      }
    });

    // TODO: Send email notifications to requester and both supervisors

  } catch (error) {
    console.error('Get the shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Counter offer (receiver proposes their own shift)
const counterOffer = async (req, res) => {
  try {
    const {
      requestId,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd
    } = req.body;

    const offeredBy = req.employeeId;
    const companyId = req.employee.companyId;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    if (request.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    if (request.requesterUserId.toString() === offeredBy.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot make a counter-offer to your own shift swap request.'
      });
    }

    if (request.status !== 'pending' && request.status !== 'offers_received') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}. No new offers can be made.`
      });
    }

    const offeredShiftStart = new Date(shiftStartDate);
    const offeredShiftEnd = new Date(shiftEndDate);
    const offeredOvertimeStart = overtimeStart ? new Date(overtimeStart) : null;
    const offeredOvertimeEnd = overtimeEnd ? new Date(overtimeEnd) : null;

    const originalShiftStart = new Date(request.shiftStartDate);
    const originalShiftEnd = new Date(request.shiftEndDate);

    const isShiftStartSameDay =
      offeredShiftStart.getUTCFullYear() === originalShiftStart.getUTCFullYear() &&
      offeredShiftStart.getUTCMonth() === originalShiftStart.getUTCMonth() &&
      offeredShiftStart.getUTCDate() === originalShiftStart.getUTCDate();

    if (!isShiftStartSameDay) {
      return res.status(400).json({
        success: false,
        message: 'Offered shift start date must be on the same day as the original requester\'s shift start date.'
      });
    }

    const isShiftEndSameDay =
      offeredShiftEnd.getUTCFullYear() === originalShiftEnd.getUTCFullYear() &&
      offeredShiftEnd.getUTCMonth() === originalShiftEnd.getUTCMonth() &&
      offeredShiftEnd.getUTCDate() === originalShiftEnd.getUTCDate();

    if (!isShiftEndSameDay) {
      return res.status(400).json({
        success: false,
        message: 'Offered shift end date must be on the same day as the original requester\'s shift end date.'
      });
    }

    if (offeredOvertimeStart) {
      const isOvertimeStartSameDay =
        offeredOvertimeStart.getUTCFullYear() === offeredShiftEnd.getUTCFullYear() &&
        offeredOvertimeStart.getUTCMonth() === offeredShiftEnd.getUTCMonth() &&
        offeredOvertimeStart.getUTCDate() === offeredShiftEnd.getUTCDate();

      if (!isOvertimeStartSameDay) {
        return res.status(400).json({
          success: false,
          message: 'Offered overtime start date must be on the same day as the offered shift end date.'
        });
      }
    }

    if (offeredOvertimeEnd) {
      const isOvertimeEndSameDay =
        offeredOvertimeEnd.getUTCFullYear() === offeredShiftEnd.getUTCFullYear() &&
        offeredOvertimeEnd.getUTCMonth() === offeredShiftEnd.getUTCMonth() &&
        offeredOvertimeEnd.getUTCDate() === offeredShiftEnd.getUTCDate();

      if (!isOvertimeEndSameDay) {
        return res.status(400).json({
          success: false,
          message: 'Offered overtime end date must be on the same day as the offered shift end date.'
        });
      }
    }

    const isExactTimeMatch =
      offeredShiftStart.getTime() === originalShiftStart.getTime() &&
      offeredShiftEnd.getTime() === originalShiftEnd.getTime() &&
      (offeredOvertimeStart?.getTime() === request.overtimeStart?.getTime() || (!offeredOvertimeStart && !request.overtimeStart)) &&
      (offeredOvertimeEnd?.getTime() === request.overtimeEnd?.getTime() || (!offeredOvertimeEnd && !request.overtimeEnd));

    if (isExactTimeMatch) {
      return res.status(400).json({
        success: false,
        message: 'Offered shift times must be different from the original requester\'s shift times.'
      });
    }

    const now = new Date();
    if (offeredShiftStart <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot offer a shift that has already started.'
      });
    }

    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    if (offeredShiftStart <= fifteenMinutesFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Shift must start at least 15 minutes from now'
      });
    }

    if (offeredShiftEnd <= offeredShiftStart) {
      return res.status(400).json({
        success: false,
        message: 'Shift end date must be after shift start date'
      });
    }

    if (offeredOvertimeStart && offeredOvertimeEnd) {
      if (offeredOvertimeStart <= offeredShiftEnd) {
        return res.status(400).json({
          success: false,
          message: 'Overtime start must be after offered shift end time'
        });
      }
      if (offeredOvertimeEnd <= offeredOvertimeStart) {
        return res.status(400).json({
          success: false,
          message: 'Overtime end must be after offered overtime start'
        });
      }
    }

    request.negotiationHistory.push({
      offeredBy,
      shiftStartDate: offeredShiftStart,
      shiftEndDate: offeredShiftEnd,
      overtimeStart: offeredOvertimeStart,
      overtimeEnd: offeredOvertimeEnd,
      status: 'offered'
    });

    if (request.status === 'pending') {
      request.status = 'offers_received';
    }
    await request.save();

    try {
      // Populate requester details for email
      await request.populate([
        { path: 'requesterUserId', select: 'fullName email' },
      ]);

      const emailResult = await EmailService.sendShiftSwapNotification(
        'new_offer',
        request.requesterUserId,
        request
      );

      if (!emailResult.success) {
        console.error('Failed to send new offer email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error preparing or sending new offer email:', emailError);
    }

    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
    ]);

    res.json({
      success: true,
      message: 'Counter offer submitted successfully',
      data: {
        shiftSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Counter offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Accept a specific counter offer (requester chooses one from the list)
const acceptSpecificOffer = async (req, res) => {
  try {
    const { requestId, offerId } = req.body; // Accept Offer ID now
    const employeeId = req.employeeId;       // Employee A (Requester)
    const companyId = req.employee.companyId;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if request belongs to same company
    if (request.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    // Check if requester is accepting their own request
    if (request.requesterUserId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the requester can accept offers.'
      });
    }

    // Check if request is in a state to accept offers
    if (request.status !== 'offers_received' && request.status !== 'pending') { // Allow accepting if there was somehow an offer already
      return res.status(400).json({
        success: false,
        message: `Request is in ${request.status} state. Cannot accept offers now.`
      });
    }

    // Find the specific offer in negotiationHistory by offerId
    const offerIndex = request.negotiationHistory.findIndex(offer => offer._id.toString() === offerId && offer.status === 'offered');
    if (offerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found or not available for acceptance.'
      });
    }
    const selectedOffer = request.negotiationHistory[offerIndex];

    // Mark the selected offer as accepted
    request.negotiationHistory[offerIndex].status = 'accepted';

    // Mark all other 'offered' offers as 'rejected' (optional, but good practice)
    request.negotiationHistory.forEach((offer, index) => {
      if (index !== offerIndex && offer.status === 'offered') {
        request.negotiationHistory[index].status = 'rejected';
      }
    });

    // Update the main request details with the accepted offer's details
    request.shiftStartDate = selectedOffer.shiftStartDate;
    request.shiftEndDate = selectedOffer.shiftEndDate;
    request.overtimeStart = selectedOffer.overtimeStart;
    request.overtimeEnd = selectedOffer.overtimeEnd;

    // Set receiver and second supervisor based on the accepted offer
    request.receiverUserId = selectedOffer.offeredBy; // Employee B who made the accepted offer

    // Need to get the supervisor of the Employee B (selectedOffer.offeredBy)
    const acceptedOfferEmployee = await Employee.findById(selectedOffer.offeredBy).select('supervisorId');
    if (acceptedOfferEmployee && acceptedOfferEmployee.supervisorId) {
      request.secondSupervisorId = acceptedOfferEmployee.supervisorId;
    } else {
      // Handle case where Employee B has no supervisor? Maybe log a warning?
      console.warn(`Accepted offer employee ${selectedOffer.offeredBy} has no supervisor.`);
    }

    // Update main request status to pending for supervisor approval
    request.status = 'pending';

    await request.save();

    try {
      const offerMaker = await Employee.findById(selectedOffer.offeredBy).select('fullName email');

      if (offerMaker) {
        // Add offerMaker to request object for email template
        const emailRequestData = request.toObject();
        emailRequestData.offerMaker = offerMaker;

        const emailResult = await EmailService.sendShiftSwapNotification(
          'offer_accepted',
          offerMaker,
          emailRequestData
        );

        if (!emailResult.success) {
          console.error('Failed to send offer accepted email:', emailResult.error);
        }
      } else {
        console.warn(`Offer maker with ID ${selectedOffer.offeredBy} not found for email notification`);
      }
    } catch (emailError) {
      console.error('Error preparing or sending offer accepted email:', emailError);
    }

    // Populate references for response (as before)
    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'receiverUserId', select: 'fullName accountName email' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' },
      { path: 'secondSupervisorId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'negotiationHistory.offeredBy', select: 'fullName accountName email position' }
    ]);

    res.json({
      success: true,
      message: 'Offer accepted successfully. Request is now pending supervisor approval.',
      data: {
        shiftSwapRequest: request
      }
    });


  } catch (error) {
    console.error('Accept specific offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update request status (approve/reject by supervisors)
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status, comment } = req.body;
    const supervisorId = req.employeeId;
    const companyId = req.employee.companyId;

    const request = await ShiftSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Shift swap request not found'
      });
    }

    // Check if request belongs to same company
    if (request.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Check if supervisor is authorized to approve/reject
    const isAuthorizedSupervisor =
      (request.firstSupervisorId && request.firstSupervisorId.toString() === supervisorId.toString()) ||
      (request.secondSupervisorId && request.secondSupervisorId.toString() === supervisorId.toString());

    if (!isAuthorizedSupervisor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to approve or reject this request.'
      });
    }

    // Update status
    request.status = status;
    request.statusEditedBy = supervisorId;
    if (comment) {
      request.comment = comment;
    }

    await request.save();

    try {
      // Populate all necessary details for emails
      await request.populate([
        { path: 'requesterUserId', select: 'fullName email' },
        { path: 'receiverUserId', select: 'fullName email' },
        { path: 'firstSupervisorId', select: 'fullName email' },
        { path: 'secondSupervisorId', select: 'fullName email' },
      ]);

      // Notify requester and receiver
      const employeesToNotify = [];
      if (request.requesterUserId) employeesToNotify.push(request.requesterUserId);
      if (request.receiverUserId) employeesToNotify.push(request.receiverUserId);

      for (const employee of employeesToNotify) {
        const emailResult = await EmailService.sendShiftSwapNotification(
          status === 'approved' ? 'request_approved' : 'request_rejected',
          employee,
          { ...request.toObject(), comment } // Include comment in data
        );

        if (!emailResult.success) {
          console.error(`Failed to send status update email to ${employee.email}:`, emailResult.error);
        }
      }

      // Notify supervisors (if they are different from requester/receiver)
      const supervisorsToNotify = [];
      if (request.firstSupervisorId) supervisorsToNotify.push(request.firstSupervisorId);
      if (request.secondSupervisorId &&
        !supervisorsToNotify.find(s => s._id.toString() === request.secondSupervisorId._id.toString())) {
        supervisorsToNotify.push(request.secondSupervisorId);
      }

      for (const supervisor of supervisorsToNotify) {
        // Avoid notifying a supervisor if they are also the requester or receiver
        if (!employeesToNotify.find(e => e._id.toString() === supervisor._id.toString())) {
          const emailResult = await EmailService.sendShiftSwapNotification(
            'supervisor_notification',
            supervisor,
            {
              ...request.toObject(),
              comment,
              action: status === 'approved' ? 'approved' : 'rejected'
            }
          );

          if (!emailResult.success) {
            console.error(`Failed to send supervisor notification email to ${supervisor.email}:`, emailResult.error);
          }
        }
      }
    } catch (emailError) {
      console.error('Error preparing or sending status update emails:', emailError);
      // Continue with the response even if emails fail
    }

    // Populate references for response (as before)
    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'receiverUserId', select: 'fullName accountName email' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' },
      { path: 'secondSupervisorId', select: 'fullName accountName email' },
      { path: 'statusEditedBy', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' }
    ]);

    res.json({
      success: true,
      message: `Request ${status} successfully`,
      data: {
        shiftSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createShiftSwapRequest,
  getShiftSwapRequests,
  getShiftSwapRequestById,
  updateShiftSwapRequest,
  deleteShiftSwapRequest,
  getTheShift,
  counterOffer,
  acceptSpecificOffer,
  updateRequestStatus
};