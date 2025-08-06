const Company = require('../models/company.model');
const EmailService = require('../services/email.service');
const JWTService = require('../services/jwt.service');

// Register company and send OTP
const registerCompany = async (req, res) => {
  try {
    const { name, description, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !description || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate if logo file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Logo file is required'
      });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({
      $or: [{ email }, { name }]
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this email or name already exists'
      });
    }

    // Create new company (not verified yet)
    const company = new Company({
      name,
      description,
      email,
      password,
      phone,
      logo: `${req.file.filename}`
    });

    // Generate and save OTP with rate limiting
    let otp;
    try {
      otp = company.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await company.save();

    // Send OTP email
    const emailResult = await EmailService.sendOTP(email, otp);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Company registered successfully. Please check your email for verification OTP.',
      data: {
        companyId: company._id,
        email: company.email,
        name: company.name,
        logo: company.logo
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify OTP and complete registration
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (company.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Company is already verified'
      });
    }

    // Verify OTP with attempt tracking
    try {
      const isOTPValid = company.verifyOTP(otp);

      if (!isOTPValid) {
        // This shouldn't happen since verifyOTP throws errors, but just in case
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }
    } catch (verificationError) {
      await company.save(); // Save the attempt count or lock status
      return res.status(400).json({
        success: false,
        message: verificationError.message
      });
    }

    await company.save();

    // Generate JWT token
    const token = JWTService.generateToken({
      companyId: company._id,
      email: company.email,
      name: company.name
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        company: {
          id: company._id,
          name: company.name,
          email: company.email,
          isVerified: company.isVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login company
const loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find company by email
    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if company is verified
    if (!company.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Compare passwords
    const isPasswordValid = await company.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = JWTService.generateCompanyToken(company);

    res.json({
      success: true,
      message: 'Login successful',
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        logo: company.logo,
        isVerified: company.isVerified
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required!'
      });
    }

    const company = await Company.findOne({ email });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (company.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Company is already verified'
      });
    }

    // Generate new OTP with rate limiting
    let otp;
    try {
      otp = company.generateOTP();
    } catch (rateLimitError) {
      return res.status(429).json({
        success: false,
        message: rateLimitError.message
      });
    }

    await company.save();

    // Send OTP email
    const emailResult = await EmailService.sendOTP(email, otp);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully. Please check your email.'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all companies (name and ID only)
const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find(
      { isVerified: true },
      '_id name logo'
    );

    res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerCompany,
  verifyOTP,
  loginCompany,
  resendOTP,
  getAllCompanies
};