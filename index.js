// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth.routes');
const employeeRequestRoutes = require('./routes/employee-request.routes');
const shiftSwapRequestRoutes = require('./routes/shift-swap-request.routes');
const dayOffSwapRequestRoutes = require('./routes/day-off-swap-request.routes');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/company-auth', authRoutes);
app.use('/api/employee-requests', employeeRequestRoutes);
app.use('/api/shift-swap-requests', shiftSwapRequestRoutes);
app.use('/api/day-off-swap-requests', dayOffSwapRequestRoutes);

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