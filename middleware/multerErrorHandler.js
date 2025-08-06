// middleware/multerErrorHandler.js
const fs = require('fs').promises;
const path = require('path');

// Helper function to clean up uploaded file
const cleanupUploadedFile = async (filePath) => {
  try {
    if (filePath) {
      await fs.unlink(filePath);
      console.log(`Cleaned up uploaded file: ${filePath}`);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error.message);
  }
};

const multerErrorHandler = async (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);

    // Clean up any uploaded file if there was a Multer error
    if (req.file && req.file.path) {
      await cleanupUploadedFile(req.file.path);
    }

    // Handle specific Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Only "logo" field is allowed.'
      });
    }

    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files (JPEG, PNG, GIF) are allowed.'
      });
    }

    // Generic Multer error
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }

  next();
};

module.exports = multerErrorHandler;