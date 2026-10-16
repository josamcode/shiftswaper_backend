// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const authRoutes = require('./routes/auth.routes');
const employeeRequestRoutes = require('./routes/employee-request.routes');
const shiftSwapRequestRoutes = require('./routes/shift-swap-request.routes');
const dayOffSwapRequestRoutes = require('./routes/day-off-swap-request.routes');
const employeeRoutes = require('./routes/employee.routes');
const employeesIDs = require('./routes/employeesIDs.routes')

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Initialize Express app
const app = express();
app.disable('x-powered-by');

// Behind a reverse proxy, set TRUST_PROXY to the number of proxy hops so
// rate limiting sees the client IP instead of the proxy's.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

// Company logos are loaded by the frontend from another origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Throttle sign-in, OTP and password reset attempts per client IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});
app.use([
  '/api/company-auth',
  '/api/employee-requests/submit-request',
  '/api/employee-requests/verify-request-otp',
  '/api/employee-requests/resend-request-otp',
  '/api/employee-requests/login',
  '/api/employee-requests/forgot-password',
  '/api/employee-requests/verify-reset-password-otp',
  '/api/employee-requests/reset-password',
  '/api/employee-requests/resend-reset-password-otp'
], authLimiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Extra comma-separated origins (e.g. a self-hosted frontend) come from CORS_ORIGINS.
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: ['https://shiftswaper.vercel.app', "https://www.shiftswaper.com", "https://shiftswaper.com", ...extraOrigins],
  credentials: true
}));

app.use(express.static('public'));

// Routes
app.use('/api/company-auth', authRoutes);
app.use('/api/employee-requests', employeeRequestRoutes);
app.use('/api/shift-swap-requests', shiftSwapRequestRoutes);
app.use('/api/day-off-swap-requests', dayOffSwapRequestRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/employees-ids', employeesIDs);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;