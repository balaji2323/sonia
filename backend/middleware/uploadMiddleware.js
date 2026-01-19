const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create subdirectories based on file type
    let subDir = 'documents';
    
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'pdfs';
    }

    const fullPath = path.join(uploadsDir, subDir);
    
    // Ensure subdirectory exists
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    // Sanitize filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  const allowedExtensions = ['.pdf', '.txt', '.docx', '.doc', '.jpeg', '.jpg', '.png'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF, TXT, DOC, DOCX, and images are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5, // Maximum 5 files per upload
  }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 10MB.';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 5 files per upload.';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        code = 'UNEXPECTED_FILE';
        break;
    }

    return res.status(400).json({ error: message, code });
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ 
      error: error.message, 
      code: 'INVALID_FILE_TYPE' 
    });
  }

  next(error);
};

// Middleware to validate uploaded files
const validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ 
      error: 'No files uploaded', 
      code: 'NO_FILES' 
    });
  }

  // Additional validation
  for (const file of req.files) {
    // Check if file was actually saved
    if (!fs.existsSync(file.path)) {
      return res.status(500).json({ 
        error: 'File upload failed', 
        code: 'UPLOAD_FAILED' 
      });
    }

    // Check file size again (double-check)
    const stats = fs.statSync(file.path);
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
    
    if (stats.size > maxSize) {
      // Clean up the file
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        error: 'File too large', 
        code: 'FILE_TOO_LARGE' 
      });
    }
  }

  next();
};

// Cleanup middleware (removes files on error)
const cleanupFiles = (filePaths) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // If response is an error and files were uploaded, clean them up
      if (res.statusCode >= 400 && filePaths && filePaths.length > 0) {
        filePaths.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      originalSend.call(this, data);
    };

    next();
  };
};

// Helper function to get file info
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date()
  };
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Middleware configurations
const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 5);
const uploadFields = upload.fields([
  { name: 'documents', maxCount: 5 },
  { name: 'images', maxCount: 3 }
]);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
  validateFiles,
  cleanupFiles,
  getFileInfo,
  deleteFile
};