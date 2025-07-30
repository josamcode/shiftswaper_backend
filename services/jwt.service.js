// services/jwt.service.js
const jwt = require('jsonwebtoken');

class JWTService {
  generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return null;
    }
  }

  // Generate company token
  generateCompanyToken(company) {
    const payload = {
      companyId: company._id,
      email: company.email,
      name: company.name
    };
    return this.generateToken(payload);
  }

  // Generate employee token
  generateEmployeeToken(employee) {
    const payload = {
      employeeId: employee._id,
      email: employee.email,
      fullName: employee.fullName,
      companyId: employee.companyId,
      position: employee.position
    };
    return this.generateToken(payload);
  }
}

module.exports = new JWTService();