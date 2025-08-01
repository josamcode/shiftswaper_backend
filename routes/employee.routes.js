// routes/employee.routes.js
const express = require('express');
const {
  getCompanySupervisors,
  getCompanyEmployees
} = require('../controllers/employee.controller');
const { authenticateCompany } = require('../middleware/auth.middleware');

const router = express.Router();

// Protected routes - Company authentication required
router.get('/supervisors',
  authenticateCompany,
  getCompanySupervisors
);

router.get('/company/employees',
  authenticateCompany,
  getCompanyEmployees
);

module.exports = router;