// controllers/employee-request.controller.js
const EmployeeRequest = require('../models/employee-request.model');
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const EmailService = require('../services/email.service');
const JWTService = require('../services/jwt.service');
const emailService = require('../services/email.service');
const employeesIDsModel = require('../models/employeesIDs.model');

// Submit employee request to company
const submitEmployeeRequest = async (req, res) => {
  try {
    const { fullName, accountName, email, phoneNumber, position, password, companyId, employeeId } = req.body;

    // 1. Validate required fields
    if (!fullName || !accountName || !email || !phoneNumber || !position || !password || !companyId || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'All fields (fullName, accountName, email, phoneNumber, position, password, companyId, employeeId) are required.',
      });
    }

    // 2. Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // 3. Validate employeeId exists and belongs to this company
    const validEmployeeId = await employeesIDsModel.findOne({
      employeeId: employeeId.trim().toUpperCase(),
      companyId: companyId,
    });

    if (!validEmployeeId) {
      return res.status(400).json({
        success: false,
        message: `Invalid or unauthorized employee ID. The ID "${employeeId}" does not exist or does not belong to this company.`,
      });
    }

    // 4. Prevent duplicate email (request or approved)
    const existingRequest = await EmployeeRequest.findOne({ email });
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'A request with this email is already pending approval.',
        });
      } else if (existingRequest.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'An employee with this email is already registered.',
        });
      }
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email is already registered.',
      });
    }

    const existingEmployeeById = await Employee.findOne({ employeeId });
    if (existingEmployeeById) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this ID is already registered.',
      });
    }

    // 5. Create request
    const employeeRequest = new EmployeeRequest({
      fullName: fullName.trim(),
      accountName: accountName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(), // Will be validated by Mongoose
      position: position.toLowerCase(),
      password,
      employeeId: validEmployeeId.employeeId,
      companyId,
    });

    // 6. Generate OTP
    let otp;
    try {
      otp = employeeRequest.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message,
      });
    }

    await employeeRequest.save();

    // 7. Send OTP
    const emailResult = await EmailService.sendOTP(email, otp, 'verification');
    if (!emailResult.success) {
      await EmployeeRequest.findByIdAndDelete(employeeRequest._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP. Please try again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Employee request submitted successfully. Please verify your email using the OTP.',
      requestId: employeeRequest._id,
      status: employeeRequest.status,
      createdAt: employeeRequest.createdAt,
    });
  } catch (error) {
    console.error('Employee request submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
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
      if (employeeRequest.position === 'moderator') {
        if (supervisorId !== undefined && supervisorId !== null) {
          return res.status(400).json({
            success: false,
            message: 'Moderators cannot be assigned a moderator. Please leave supervisorId empty or null.'
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
        employeeId: employeeRequest.employeeId,
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
    const { email, employeeId: inputEmployeeId, password } = req.body;

    // Ensure at least one identifier is provided
    if (!email && !inputEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either email or employee ID',
      });
    }

    let employee;
    let lookupField;

    // First, try to find by employeeId (if provided)
    if (inputEmployeeId) {
      employee = await Employee.findOne({ employeeId: inputEmployeeId.trim().toUpperCase() });
      if (employee) {
        lookupField = 'employeeId';
      }
    }

    // If not found by employeeId, try by email
    if (!employee && email) {
      employee = await Employee.findOne({ email: email.toLowerCase().trim() });
      if (employee) {
        lookupField = 'email';
      }
    }

    // If no employee found by either field
    if (!employee) {
      // Check for pending request by email (if email was provided)
      if (email) {
        const pendingRequest = await EmployeeRequest.findOne({
          email: email.toLowerCase().trim(),
          status: 'pending',
        });

        if (pendingRequest) {
          return res.status(400).json({
            success: false,
            message: 'Your registration request is still pending approval from the company',
          });
        }

        const rejectedRequest = await EmployeeRequest.findOne({
          email: email.toLowerCase().trim(),
          status: 'rejected',
        });

        if (rejectedRequest) {
          return res.status(400).json({
            success: false,
            message: 'Your registration request was rejected. Reason: ' + rejectedRequest.rejectionReason,
          });
        }
      }

      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Compare password
    const isPasswordValid = await employee.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Fetch company name
    let company = null;
    if (employee.companyId) {
      company = await Company.findById(employee.companyId).select('name');
    }

    // Generate JWT token
    const token = JWTService.generateToken({
      employeeId: employee._id,
      email: employee.email,
      fullName: employee.fullName,
      companyId: employee.companyId,
      position: employee.position,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          accountName: employee.accountName,
          email: employee.email,
          employeeId: employee.employeeId,
          position: employee.position,
          isVerified: employee.isVerified,
          companyName: company ? company.name : null,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Employee login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: error.message, // Include the error message for debugging purposes
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

// Forgot Password - Send OTP to email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find employee by email
    const employee = await Employee.findOne({
      email: email.toLowerCase().trim()
    });

    if (!employee) {
      // Don't reveal if email exists or not for security reasons
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset OTP shortly.'
      });
    }

    // Generate OTP with rate limiting
    let otp;
    try {
      otp = employee.generateResetPasswordOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employee.save();

    // Send OTP via email
    const emailResult = await EmailService.sendOTP(employee.email, otp, 'password_reset');
    if (!emailResult.success) {
      // Clear the OTP if email sending failed
      employee.clearResetPasswordOTP();
      await employee.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset OTP has been sent to your email address.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

const verifyResetPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const employee = await Employee.findOne({
      email: email.toLowerCase().trim()
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Verify OTP with attempt tracking
    try {
      const isOTPValid = employee.verifyResetPasswordOTP(otp);

      if (!isOTPValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }
    } catch (verificationError) {
      await employee.save();
      return res.status(400).json({
        success: false,
        message: verificationError.message
      });
    }

    employee.resetOTPAttempts = 0;
    await employee.save();

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    });

  } catch (error) {
    console.error('Verify reset password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reset Password using OTP
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    const employee = await Employee.findOne({
      email: email.toLowerCase().trim()
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Verify OTP
    try {
      const isOTPValid = employee.verifyResetPasswordOTP(otp);

      if (!isOTPValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }
    } catch (verificationError) {
      await employee.save(); // Save the attempt count or lock status
      return res.status(400).json({
        success: false,
        message: verificationError.message
      });
    }

    // Update password (will be hashed by pre-save middleware)
    employee.password = newPassword;

    // OTP fields are already cleared by verifyResetPasswordOTP method
    await employee.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};

// Resend OTP for password reset
const resendResetPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const employee = await Employee.findOne({
      email: email.toLowerCase().trim()
    });

    if (!employee) {
      // Don't reveal if email exists or not for security reasons
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset OTP shortly.'
      });
    }

    // Generate new OTP with rate limiting
    let otp;
    try {
      otp = employee.generateResetPasswordOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employee.save();

    // Send OTP via email
    const emailResult = await EmailService.sendOTP(employee.email, otp, 'password_reset');
    if (!emailResult.success) {
      // Clear the OTP if email sending failed
      employee.clearResetPasswordOTP();
      await employee.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset OTP has been resent to your email address.'
    });

  } catch (error) {
    console.error('Resend reset password OTP error:', error);
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
  resendRequestOTP,

  forgotPassword,
  verifyResetPasswordOTP,
  resetPassword,
  resendResetPasswordOTP
};