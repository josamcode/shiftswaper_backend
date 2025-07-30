// middleware/auth.middleware.js
const JWTService = require('../services/jwt.service');
const Company = require('../models/company.model');
const Employee = require('../models/employee.model');

// Authenticate company using JWT token
const authenticateCompany = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JWTService.verifyToken(token);

    if (!decoded || !decoded.companyId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    const company = await Company.findById(decoded.companyId);
    if (!company) {
      return res.status(401).json({
        success: false,
        message: 'Company not found.'
      });
    }

    req.company = company;
    req.companyId = company._id;
    next();
  } catch (error) {
    console.error('Company authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Authenticate employee using JWT token
const authenticateEmployee = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JWTService.verifyToken(token);

    if (!decoded || !decoded.employeeId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    const employee = await Employee.findById(decoded.employeeId);
    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    req.employee = employee;
    req.employeeId = employee._id;
    next();
  } catch (error) {
    console.error('Employee authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

module.exports = {
  authenticateCompany,
  authenticateEmployee
};