// controllers/day-off-swap-request.controller.js
const DayOffSwapRequest = require('../models/day-off-swap-request.model');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const EmailService = require('../services/email.service');

// Create day off swap request
const createDayOffSwapRequest = async (req, res) => {
  try {
    const {
      originalDayOff,
      requestedDayOff,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd,
      reason
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

    // Check if requester already has a request for this original day off
    const existingRequest = await DayOffSwapRequest.findOne({
      requesterUserId,
      originalDayOff,
      companyId
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a request for this original day off'
      });
    }

    // Create day off swap request
    const dayOffSwapRequest = new DayOffSwapRequest({
      originalDayOff,
      requestedDayOff,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd,
      reason,
      requesterUserId,
      companyId,
      firstSupervisorId
    });

    await dayOffSwapRequest.save();

    // Populate references for response
    await dayOffSwapRequest.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Day off swap request created successfully',
      data: {
        dayOffSwapRequest
      }
    });

  } catch (error) {
    console.error('Create day off swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get day off swap requests (with filtering)
const getDayOffSwapRequests = async (req, res) => {
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

    const requests = await DayOffSwapRequest.find(filter)
      .populate([
        { path: 'requesterUserId', select: 'fullName accountName email position' },
        { path: 'receiverUserId', select: 'fullName accountName email position' },
        { path: 'firstSupervisorId', select: 'fullName accountName email position' },
        { path: 'secondSupervisorId', select: 'fullName accountName email position' },
        { path: 'statusEditedBy', select: 'fullName accountName email position' },
        { path: 'companyId', select: 'name' },
        { path: 'matches.matchedBy', select: 'fullName accountName email position' }
      ])
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        requests
      }
    });

  } catch (error) {
    console.error('Get day off swap requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get day off swap request by ID
const getDayOffSwapRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.employeeId;
    const companyId = req.employee.companyId;

    const request = await DayOffSwapRequest.findOne({
      _id: requestId,
      companyId
    }).populate([
      { path: 'requesterUserId', select: 'fullName accountName email position' },
      { path: 'receiverUserId', select: 'fullName accountName email position' },
      { path: 'firstSupervisorId', select: 'fullName accountName email position' },
      { path: 'secondSupervisorId', select: 'fullName accountName email position' },
      { path: 'statusEditedBy', select: 'fullName accountName email position' },
      { path: 'companyId', select: 'name' },
      { path: 'matches.matchedBy', select: 'fullName accountName email position' }
    ]);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Day off swap request not found'
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
    console.error('Get day off swap request by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Match day off swap request (propose a swap)
const matchDayOffSwapRequest = async (req, res) => {
  try {
    const {
      requestId,
      originalDayOff,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd
    } = req.body;

    const matchedBy = req.employeeId;
    const companyId = req.employee.companyId;

    const request = await DayOffSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Day off swap request not found'
      });
    }

    if (request.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    if (request.requesterUserId.toString() === matchedBy.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot match your own day off swap request.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}. No new matches can be made.`
      });
    }

    // Check if the requester's requested day off matches the matcher's original day off
    const requesterRequestedDay = new Date(request.requestedDayOff);
    const matcherOriginalDay = new Date(originalDayOff);

    if (requesterRequestedDay.getTime() !== matcherOriginalDay.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Your original day off must match the requester\'s requested day off.'
      });
    }

    request.matches.push({
      matchedBy,
      originalDayOff,
      shiftStartDate,
      shiftEndDate,
      overtimeStart,
      overtimeEnd,
      status: 'proposed'
    });

    if (request.status === 'pending') {
      request.status = 'matched';
    }

    await request.save();

    try {
      await request.populate([
        { path: 'requesterUserId', select: 'fullName email' },
      ]);

      const emailResult = await EmailService.sendDayOffSwapNotification(
        'new_match',
        request.requesterUserId,
        request
      );

      if (!emailResult.success) {
        console.error('Failed to send new match email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error preparing or sending new match email:', emailError);
    }

    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'matches.matchedBy', select: 'fullName accountName email' }
    ]);

    res.json({
      success: true,
      message: 'Match proposal submitted successfully',
      data: {
        dayOffSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Match day off swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Accept a specific match (requester chooses one from the list)
const acceptMatch = async (req, res) => {
  try {
    const { requestId, matchId } = req.body; // Accept Match ID now
    const employeeId = req.employeeId; // Employee A (Requester)
    const companyId = req.employee.companyId;

    const request = await DayOffSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Day off swap request not found'
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
        message: 'Access denied. Only the requester can accept matches.'
      });
    }

    // Check if request is in a state to accept matches
    if (request.status !== 'matched') {
      return res.status(400).json({
        success: false,
        message: `Request is in ${request.status} state. Cannot accept matches now.`
      });
    }

    // Find the specific match in matches history by matchId
    const matchIndex = request.matches.findIndex(match => match._id.toString() === matchId && match.status === 'proposed');
    if (matchIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Match not found or not available for acceptance.'
      });
    }
    const selectedMatch = request.matches[matchIndex];

    // Mark the selected match as accepted
    request.matches[matchIndex].status = 'accepted';

    // Mark all other 'proposed' matches as 'rejected'
    request.matches.forEach((match, index) => {
      if (index !== matchIndex && match.status === 'proposed') {
        request.matches[index].status = 'rejected';
      }
    });

    // Update the main request details with the accepted match's details
    request.receiverUserId = selectedMatch.matchedBy; // Employee B who made the accepted match
    request.receiverOriginalDayOff = selectedMatch.originalDayOff;
    request.receiverShiftStartDate = selectedMatch.shiftStartDate;
    request.receiverShiftEndDate = selectedMatch.shiftEndDate;
    request.receiverOvertimeStart = selectedMatch.overtimeStart;
    request.receiverOvertimeEnd = selectedMatch.overtimeEnd;

    // Set second supervisor based on the accepted match
    // Need to get the supervisor of the Employee B (selectedMatch.matchedBy)
    const acceptedMatchEmployee = await Employee.findById(selectedMatch.matchedBy).select('supervisorId');
    if (acceptedMatchEmployee && acceptedMatchEmployee.supervisorId) {
      request.secondSupervisorId = acceptedMatchEmployee.supervisorId;
    } else {
      console.warn(`Accepted match employee ${selectedMatch.matchedBy} has no supervisor.`);
    }

    // Update main request status to pending for supervisor approval
    request.status = 'pending';

    await request.save();

    // Send email notification to the employee who made the accepted match
    try {
      const matchMaker = await Employee.findById(selectedMatch.matchedBy).select('fullName email');

      if (matchMaker) {
        // Add matchMaker to request object for email template
        const emailRequestData = request.toObject();
        emailRequestData.matchMaker = matchMaker;

        const emailResult = await EmailService.sendDayOffSwapNotification(
          'match_accepted',
          matchMaker,
          emailRequestData
        );

        if (!emailResult.success) {
          console.error('Failed to send match accepted email:', emailResult.error);
        }
      } else {
        console.warn(`Match maker with ID ${selectedMatch.matchedBy} not found for email notification`);
      }
    } catch (emailError) {
      console.error('Error preparing or sending match accepted email:', emailError);
    }

    // Populate references for response
    await request.populate([
      { path: 'requesterUserId', select: 'fullName accountName email' },
      { path: 'receiverUserId', select: 'fullName accountName email' },
      { path: 'firstSupervisorId', select: 'fullName accountName email' },
      { path: 'secondSupervisorId', select: 'fullName accountName email' },
      { path: 'companyId', select: 'name' },
      { path: 'matches.matchedBy', select: 'fullName accountName email position' }
    ]);

    res.json({
      success: true,
      message: 'Match accepted successfully. Request is now pending supervisor approval.',
      data: {
        dayOffSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Accept match error:', error);
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

    const request = await DayOffSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Day off swap request not found'
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

    // Send email notifications based on the status
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
        const emailResult = await EmailService.sendDayOffSwapNotification(
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
          const emailResult = await EmailService.sendDayOffSwapNotification(
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

    // Populate references for response
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
        dayOffSwapRequest: request
      }
    });

  } catch (error) {
    console.error('Update day off request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete day off swap request (before acceptance)
const deleteDayOffSwapRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const employeeId = req.employeeId;

    const request = await DayOffSwapRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Day off swap request not found'
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

    // Check if day off has already passed
    const now = new Date();
    const dayOff = new Date(request.originalDayOff);
    if (dayOff <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete request after the day off has passed.'
      });
    }

    await DayOffSwapRequest.findByIdAndDelete(requestId);

    res.json({
      success: true,
      message: 'Day off swap request deleted successfully'
    });

  } catch (error) {
    console.error('Delete day off swap request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createDayOffSwapRequest,
  getDayOffSwapRequests,
  getDayOffSwapRequestById,
  matchDayOffSwapRequest,
  acceptMatch,
  updateRequestStatus,
  deleteDayOffSwapRequest
};