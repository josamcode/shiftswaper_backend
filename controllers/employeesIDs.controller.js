// controllers/employee.controller.js

const mongoose = require('mongoose');
const xlsx = require('xlsx');
const EmployeesIDs = require('../models/employeesIDs.model');
const { validateCreateEmployee, validateUpdateEmployee } = require('../validators/employeesIDs.validator');

/**
 * CREATE - Add a single employee
 */
exports.createEmployee = async (req, res) => {
  const { employeeId, name, position } = req.body;
  const companyId = req.companyId;

  const validation = validateCreateEmployee({ employeeId, name, position, companyId });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  try {
    const employee = new EmployeesIDs({
      employeeId: employeeId?.trim().toUpperCase(),
      name: name.trim(),
      position: position.toLowerCase(),
      companyId,
    });

    await employee.save();

    return res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      data: employee,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate employee ID. This ID already exists.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error while creating employee.',
      error: err.message,
    });
  }
};

/**
 * READ - Get all employees for the authenticated company
 */
exports.getEmployees = async (req, res) => {
  try {
    const employees = await EmployeesIDs.find({ companyId: req.companyId })
      .select('employeeId name position createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: err.message,
    });
  }
};

/**
 * UPDATE - Update employee (name, position)
 */
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, position } = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID format.',
    });
  }

  const validation = validateUpdateEmployee({ name, position });
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors,
    });
  }

  try {
    const employee = await EmployeesIDs.findOne({ _id: id, companyId: req.companyId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or not authorized.',
      });
    }

    // Update fields
    if (name) employee.name = name.trim();
    if (position) employee.position = position.toLowerCase();

    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: employee,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error while updating employee.',
      error: err.message,
    });
  }
};

/**
 * DELETE - Remove an employee
 */
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID format.',
    });
  }

  try {
    const employee = await EmployeesIDs.findOneAndDelete({
      _id: id,
      companyId: req.companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or not authorized.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee deleted successfully.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting employee.',
      error: err.message,
    });
  }
};

/**
 * BULK UPLOAD - Add multiple employees from Excel file
 */
/**
 * BULK UPLOAD - Add multiple employees from Excel file
 */
exports.uploadEmployeesExcel = async (req, res) => {
  if (!req.file) { // Note: multer puts file in req.file (not req.files.file)
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
    });
  }
  const file = req.file; // multer uses req.file for single upload
  let workbook;
  let data;
  try {
    // Handle by file extension
    if (file.originalname.endsWith('.csv')) {
      const csvData = file.buffer.toString('utf-8');
      workbook = xlsx.read(csvData, { type: 'string', bookType: 'csv' });
    } else {
      // Excel files
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    data = xlsx.utils.sheet_to_json(sheet);
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty.',
      });
    }
    const companyId = req.companyId;
    const employeesToInsert = [];
    const errors = [];
    const seenIds = new Set();
    for (let row of data) {
      const employeeId = row['Employee ID'] || row['employeeId'] || row['ID'];
      const name = row['Name'] || row['name'];
      const position = row['Position'] || row['position'];
      if (!employeeId || !name || !position) {
        errors.push({ row: row, error: 'Missing required fields: Employee ID, Name, or Position' });
        continue;
      }
      const validation = validateCreateEmployee({ employeeId, name, position, companyId });
      if (!validation.isValid) {
        errors.push({ row: row, error: validation.errors });
        continue;
      }
      const finalId = employeeId.toString().trim().toUpperCase();
      if (seenIds.has(finalId)) {
        errors.push({ row: row, error: 'Duplicate ID in file' });
        continue;
      }
      seenIds.add(finalId);
      employeesToInsert.push({
        employeeId: finalId,
        name: name.toString().trim(),
        position: position.toString().trim().toLowerCase(),
        companyId,
      });
    }
    if (employeesToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data to insert.',
        errors: errors,
      });
    }
    const result = await EmployeesIDs.insertMany(employeesToInsert, { ordered: false });
    return res.status(201).json({
      success: true,
      message: `Successfully added ${result.length} employees.`,
      insertedCount: result.length,
      errors: errors.length ? errors : null,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'One or more employee IDs already exist.',
      });
    }
    if (err instanceof Error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process file.',
        error: err.message,
      });
    }
    console.error('Upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
}; 