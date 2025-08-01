// controllers/employee-request.controller.js
const EmployeeRequest = require('../models/employee-request.model');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const EmailService = require('../services/email.service');
const JWTService = require('../services/jwt.service');
const emailService = require('../services/email.service');

// Submit employee request to company
const submitEmployeeRequest = async (req, res) => {
  try {
    const { fullName, accountName, email, position, password, companyId } = req.body;

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if employee request already exists
    const existingRequest = await EmployeeRequest.findOne({ email });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'A request with this email is already pending approval'
        });
      } else if (existingRequest.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'An employee with this email is already registered'
        });
      }
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email is already registered'
      });
    }

    // Create employee request
    const employeeRequest = new EmployeeRequest({
      fullName,
      accountName,
      email,
      position,
      password,
      companyId
    });

    // Generate and save OTP
    let otp;
    try {
      otp = employeeRequest.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employeeRequest.save();

    // Send OTP via Email for verification
    const emailResult = await EmailService.sendOTP(email, otp, 'verification');

    if (!emailResult.success) {
      // Rollback request creation if email fails
      await EmployeeRequest.findByIdAndDelete(employeeRequest._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP via email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Employee request submitted successfully. Please check your email for verification OTP.',
      requestId: employeeRequest._id,
      status: employeeRequest.status,
      createdAt: employeeRequest.createdAt
    });

  } catch (error) {
    console.error('Employee request submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify request OTP using email and OTP only
const verifyRequestOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find pending request by email
    const employeeRequest = await EmployeeRequest.findOne({
      email,
      status: 'pending'
    });

    if (!employeeRequest) {
      return res.status(404).json({
        success: false,
        message: 'No pending request found for this email'
      });
    }

    // Verify OTP with attempt tracking
    try {
      const isOTPValid = employeeRequest.verifyOTP(otp);

      if (!isOTPValid) {
        // This shouldn't happen since verifyOTP throws errors, but just in case
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }
    } catch (verificationError) {
      await employeeRequest.save(); // Save the attempt count or lock status
      return res.status(400).json({
        success: false,
        message: verificationError.message
      });
    }

    await employeeRequest.save();

    res.json({
      success: true,
      message: 'Email verified successfully. Request is now pending company approval.',
      requestId: employeeRequest._id,
      status: employeeRequest.status,
      verifiedAt: new Date()
    });

  } catch (error) {
    console.error('Request OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get company's pending employee requests (Company authenticated)
const getCompanyRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const requests = await EmployeeRequest.find({
      companyId: req.companyId,
      status
    }).populate('companyId', 'name');

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get company requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all company requests (Company authenticated)
const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = { companyId: req.companyId };

    if (status) {
      filter.status = status;
    }

    const requests = await EmployeeRequest.find(filter)
      .populate('companyId', 'name')
      .populate('supervisorId', 'fullName accountName')
      .populate('approvedBy', 'fullName accountName')
      .populate('rejectedBy', 'fullName accountName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('Get all company requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve or reject employee request (Company authenticated)
const processEmployeeRequest = async (req, res) => {
  try {
    const { requestId, action, supervisorId, rejectionReason } = req.body;

    const employeeRequest = await EmployeeRequest.findById(requestId);
    if (!employeeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Employee request not found'
      });
    }

    // Verify that the request belongs to the authenticated company
    if (employeeRequest.companyId.toString() !== req.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This request does not belong to your company.'
      });
    }

    if (employeeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${employeeRequest.status}`
      });
    }

    if (action === 'approve') {
      let finalSupervisorId = null; // Default to null

      // If the position is 'supervisor', they should not have a supervisor
      if (employeeRequest.position === 'supervisor') {
        if (supervisorId !== undefined && supervisorId !== null) {
          return res.status(400).json({
            success: false,
            message: 'Supervisors cannot be assigned a supervisor. Please leave supervisorId empty or null.'
          });
        }
        // If position is supervisor, finalSupervisorId remains null
      } else {
        // For 'expert' or 'sme', a supervisorId is required
        if (!supervisorId) {
          return res.status(400).json({
            success: false,
            message: `A supervisor ID is required for position '${employeeRequest.position}'.`
          });
        }

        // Check if supervisor exists
        const supervisor = await Employee.findById(supervisorId);
        if (!supervisor) {
          return res.status(404).json({
            success: false,
            message: 'Supervisor not found'
          });
        }

        // Verify supervisor belongs to the same company
        if (supervisor.companyId.toString() !== req.companyId.toString()) {
          return res.status(400).json({
            success: false,
            message: 'Supervisor must belong to the same company'
          });
        }

        finalSupervisorId = supervisorId;
      }

      // Update request status
      employeeRequest.status = 'approved';
      employeeRequest.supervisorId = finalSupervisorId; // Use the determined supervisor ID
      employeeRequest.approvedBy = req.company._id; // Company ID for approval
      employeeRequest.approvedAt = new Date();

      await employeeRequest.save();

      // Create employee from approved request
      const employee = new Employee({
        fullName: employeeRequest.fullName,
        accountName: employeeRequest.accountName,
        email: employeeRequest.email,
        position: employeeRequest.position,
        password: employeeRequest.password, // Already hashed
        companyId: employeeRequest.companyId,
        supervisorId: employeeRequest.supervisorId,
        employeeRequestId: employeeRequest._id,
        isVerified: true
      });

      employee.$locals = employee.$locals || {};
      employee.$locals.passwordAlreadyHashed = true;

      await employee.save();

      res.json({
        success: true,
        message: 'Employee request approved successfully and employee registered',
        requestId: employeeRequest._id,
        status: employeeRequest.status,
        approvedAt: employeeRequest.approvedAt,
        employeeId: employee._id
      });

    } else if (action === 'reject') {
      employeeRequest.status = 'rejected';
      employeeRequest.rejectionReason = rejectionReason;
      employeeRequest.rejectedBy = req.company._id; // Company ID for rejection
      employeeRequest.rejectedAt = new Date();

      await employeeRequest.save();

      res.json({
        success: true,
        message: 'Employee request rejected',
        data: {
          requestId: employeeRequest._id,
          status: employeeRequest.status,
          rejectionReason: employeeRequest.rejectionReason,
          rejectedAt: employeeRequest.rejectedAt
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

  } catch (error) {
    console.error('Process employee request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Employee login
const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find employee by email
    const employee = await Employee.findOne({ email });

    if (!employee) {
      // Check if there's a pending request for this email
      const pendingRequest = await EmployeeRequest.findOne({
        email,
        status: 'pending'
      });

      if (pendingRequest) {
        return res.status(400).json({
          success: false,
          message: 'Your registration request is still pending approval from the company'
        });
      }

      // Check if there's a rejected request for this email
      const rejectedRequest = await EmployeeRequest.findOne({
        email,
        status: 'rejected'
      });

      if (rejectedRequest) {
        return res.status(400).json({
          success: false,
          message: 'Your registration request was rejected. Reason: ' + rejectedRequest.rejectionReason
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Compare passwords
    const isPasswordValid = await employee.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Fetch company data to get the company name
    let company = null;
    if (employee.companyId) {
      company = await Company.findById(employee.companyId).select('name'); // Only get the name field
    }

    // Generate JWT token
    const token = JWTService.generateToken({
      employeeId: employee._id,
      email: employee.email,
      fullName: employee.fullName,
      companyId: employee.companyId,
      position: employee.position
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          accountName: employee.accountName,
          email: employee.email,
          position: employee.position,
          isVerified: employee.isVerified,
          companyName: company ? company.name : null
        },
        token
      }
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend OTP for request verification
const resendRequestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const employeeRequest = await EmployeeRequest.findOne({
      email,
      status: 'pending'
    });

    if (!employeeRequest) {
      return res.status(404).json({
        success: false,
        message: 'No pending request found for this email'
      });
    }

    // Generate new OTP with rate limiting
    let otp;
    try {
      otp = employeeRequest.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employeeRequest.save();

    // Send OTP via Email
    const emailResult = await emailService.sendOTP(employeeRequest.email, otp, 'verification');

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP via email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully. Please check your email.'
    });

  } catch (error) {
    console.error('Resend request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitEmployeeRequest,
  verifyRequestOTP,
  getCompanyRequests,
  getAllRequests,
  processEmployeeRequest,
  loginEmployee,
  resendRequestOTP
};