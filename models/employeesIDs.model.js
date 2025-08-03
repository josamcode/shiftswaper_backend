// models/employeesIDs.model.js

const mongoose = require('mongoose');

const EmployeesIDsSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      enum: ['expert', 'supervisor', 'sme', 'moderator'],
      lowercase: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmployeesIDs', EmployeesIDsSchema);