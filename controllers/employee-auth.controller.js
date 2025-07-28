// controllers/employee-auth.controller.js
const Employee = require('../models/employee.model');
const Company = require('../models/company.model');
const WhatsAppService = require('../services/whatsapp.service');
const JWTService = require('../services/jwt.service');

// Register employee and send OTP via WhatsApp
const registerEmployee = async (req, res) => {
  try {
    const { fullName, accountName, position, phone, password, companyId, supervisorId } = req.body;

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ phone }, { accountName }]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this phone number or account name already exists'
      });
    }

    // Check if supervisor exists (if provided)
    if (supervisorId) {
      const supervisor = await Employee.findById(supervisorId);
      if (!supervisor) {
        return res.status(404).json({
          success: false,
          message: 'Supervisor not found'
        });
      }
    }

    // Create new employee (not verified yet)
    const employee = new Employee({
      fullName,
      accountName,
      position,
      phone,
      password,
      companyId,
      supervisorId
    });

    // Generate and save OTP with rate limiting
    let otp;
    try {
      otp = employee.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employee.save();

    // Send OTP via WhatsApp
    const whatsappResult = await WhatsAppService.sendOTP(phone, otp);

    if (!whatsappResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP via WhatsApp. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully. Please check your WhatsApp for verification OTP.',
      data: {
        employeeId: employee._id,
        phone: employee.phone,
        fullName: employee.fullName
      }
    });

  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify employee OTP (for registration)
const verifyEmployeeOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const employee = await Employee.findOne({ phone });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (employee.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Employee is already verified'
      });
    }

    // Verify OTP with attempt tracking
    try {
      const isOTPValid = employee.verifyOTP(otp);

      if (!isOTPValid) {
        // This shouldn't happen since verifyOTP throws errors, but just in case
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

    await employee.save();

    // Generate JWT token
    const token = JWTService.generateToken({
      employeeId: employee._id,
      phone: employee.phone,
      fullName: employee.fullName,
      companyId: employee.companyId,
      position: employee.position
    });

    res.json({
      success: true,
      message: 'Phone verified successfully',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          accountName: employee.accountName,
          phone: employee.phone,
          position: employee.position,
          isVerified: employee.isVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Employee OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login employee with password
const loginEmployee = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find employee by phone
    const employee = await Employee.findOne({ phone });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if employee is verified
    if (!employee.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your phone number first'
      });
    }

    // Compare passwords
    const isPasswordValid = await employee.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Generate JWT token
    const token = JWTService.generateToken({
      employeeId: employee._id,
      phone: employee.phone,
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
          phone: employee.phone,
          position: employee.position,
          isVerified: employee.isVerified
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

// Resend OTP for employee registration
const resendEmployeeOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    const employee = await Employee.findOne({ phone });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (employee.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Employee is already verified'
      });
    }

    // Generate new OTP with rate limiting
    let otp;
    try {
      otp = employee.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await employee.save();

    // Send OTP via WhatsApp
    const whatsappResult = await WhatsAppService.sendOTP(phone, otp);

    if (!whatsappResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification OTP via WhatsApp. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully. Please check your WhatsApp.'
    });

  } catch (error) {
    console.error('Resend employee OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerEmployee,
  verifyEmployeeOTP,
  loginEmployee,
  resendEmployeeOTP
};