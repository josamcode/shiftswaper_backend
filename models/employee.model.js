// models/employee.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    position: {
      type: String,
      required: true,
      enum: ["expert", "supervisor", "sme"]
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    employeeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeRequest',
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: true, // Already verified through request approval
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

EmployeeSchema.methods.toJSON = function () {
  const employee = this.toObject();
  delete employee.password;
  return employee;
};

EmployeeSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Employee', EmployeeSchema);