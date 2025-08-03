// controllers/employee.controller.js
const Employee = require('../models/employee.model');

// Get all supervisors for a company (Company authenticated)
const getCompanySupervisors = async (req, res) => {
  try {
    const supervisors = await Employee.find({
      companyId: req.companyId,
      position: { $in: ['supervisor', 'moderator'] },
      isVerified: true
    }).select('_id fullName accountName email position');

    res.json({
      success: true,
      supervisors
    });

  } catch (error) {
    console.error('Get company supervisors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all employees for a company (Company authenticated)
const getCompanyEmployees = async (req, res) => {
  try {
    const { position, isVerified = true } = req.query;

    let filter = {
      companyId: req.companyId,
      isVerified: isVerified === 'true'
    };

    if (position) {
      filter.position = position;
    }

    const employees = await Employee.find(filter)
      .select('_id fullName accountName email position isVerified createdAt')
      .populate('supervisorId', 'fullName accountName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employees
    });

  } catch (error) {
    console.error('Get company employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCompanySupervisors,
  getCompanyEmployees
};