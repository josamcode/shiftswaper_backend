// validators/employeeId.validator.js

const mongoose = require('mongoose');
const { Types } = mongoose;

// Validation rules for creating/updating an Employee ID
const validateCreateEmployee = (data) => {
  const errors = [];

  // employeeId - optional if auto-generated, but if provided, validate
  if (data.employeeId !== undefined) {
    if (typeof data.employeeId !== 'string' || data.employeeId.trim().length === 0) {
      errors.push({ field: 'employeeId', message: 'Employee ID must be a non-empty string.' });
    }
  }

  // name is required
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string.' });
  }

  // position is required and must be one of the allowed values
  const validPositions = ['expert', 'supervisor', 'sme', 'moderator'];
  if (!data.position || typeof data.position !== 'string') {
    errors.push({ field: 'position', message: 'Position is required and must be a string.' });
  } else if (!validPositions.includes(data.position.toLowerCase())) {
    errors.push({ field: 'position', message: `Position must be one of: ${validPositions.join(', ')}.` });
  }

  // companyId is required and must be a valid ObjectId
  if (!data.companyId) {
    errors.push({ field: 'companyId', message: 'companyId is required.' });
  } else if (!Types.ObjectId.isValid(data.companyId)) {
    errors.push({ field: 'companyId', message: 'Invalid companyId format. Must be a valid MongoDB ObjectId.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validation for updates (some fields may be restricted)
const validateUpdateEmployee = (data) => {
  const errors = [];

  if (data.employeeId !== undefined) {
    if (typeof data.employeeId !== 'string' || data.employeeId.trim().length === 0) {
      errors.push({ field: 'employeeId', message: 'Employee ID must be a non-empty string if provided.' });
    }
  }

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name must be a non-empty string if provided.' });
    }
  }

  if (data.position !== undefined) {
    const validPositions = ['expert', 'supervisor', 'sme', 'moderator'];
    if (typeof data.position !== 'string') {
      errors.push({ field: 'position', message: 'Position must be a string.' });
    } else if (!validPositions.includes(data.position.toLowerCase())) {
      errors.push({ field: 'position', message: `Position must be one of: ${validPositions.join(', ')}.` });
    }
  }

  if (data.companyId !== undefined) {
    if (!Types.ObjectId.isValid(data.companyId)) {
      errors.push({ field: 'companyId', message: 'Invalid companyId format.' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateCreateEmployee,
  validateUpdateEmployee,
};