// routes/employee.route.js

const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer.middleware');
const {
  authenticateCompany,
} = require('../middleware/auth.middleware');

const employeeController = require('../controllers/employeesIDs.controller');

// Single employee CRUD
router.post('/', authenticateCompany, employeeController.createEmployee);
router.get('/', authenticateCompany, employeeController.getEmployees);
router.put('/:id', authenticateCompany, employeeController.updateEmployee);
router.delete('/:id', authenticateCompany, employeeController.deleteEmployee);

// Bulk upload - must use upload.single('file')
router.post(
  '/upload',
  authenticateCompany,
  upload.single('file'), // This parses the file
  employeeController.uploadEmployeesExcel
);

module.exports = router;