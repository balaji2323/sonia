const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

const faqController = require('../controllers/faqController');
const {
  authenticateToken,
  requireAdmin,
  rateLimitPerUser,
  logActivity
} = require('../middleware/authMiddleware');
const {
  uploadMultiple,
  handleUploadError,
  validateFiles
} = require('../middleware/uploadMiddleware');

// Helper to run validation result check
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Validation schemas
const addFAQValidation = [
  body('question')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Question must be between 5 and 500 characters'),
  body('answer')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('keywords')
    .optional()
    .custom((value) => {
      const arr = typeof value === 'string'
        ? value.split(',').map(k => k.trim())
        : value;
      if (!Array.isArray(arr) || arr.some(k => k.length > 30)) {
        throw new Error('Each keyword must be 30 characters or less');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  runValidation
];

const updateFAQValidation = [
  param('faqId')
    .isMongoId()
    .withMessage('Invalid FAQ ID format'),
  body('question')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Question must be between 5 and 500 characters'),
  body('answer')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Answer must be between 10 and 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('keywords')
    .optional()
    .custom((value) => {
      const arr = typeof value === 'string'
        ? value.split(',').map(k => k.trim())
        : value;
      if (!Array.isArray(arr) || arr.some(k => k.length > 30)) {
        throw new Error('Each keyword must be 30 characters or less');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  runValidation
];

const uploadDocumentValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('documentType')
    .optional()
    .isIn(['faq', 'policy', 'guide', 'manual', 'other'])
    .withMessage('Document type must be faq, policy, guide, manual, or other'),
  body('keywords')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const arr = value.split(',').map(k => k.trim());
        if (arr.length > 20 || arr.some(k => k.length > 30)) {
          throw new Error('Maximum 20 keywords, each ≤30 characters');
        }
      }
      return true;
    }),
  runValidation
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),
  query('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  runValidation
];

// All routes require authentication
router.use(authenticateToken);

// Upload and process documents (Admin only)
router.post(
  '/upload',
  requireAdmin,
  rateLimitPerUser(20, 60 * 60 * 1000),
  uploadMultiple,
  handleUploadError,
  validateFiles,
  uploadDocumentValidation,
  logActivity('upload_document'),
  faqController.uploadDocument
);

// Add FAQ manually (Admin only)
router.post(
  '/faqs',
  requireAdmin,
  rateLimitPerUser(50, 60 * 60 * 1000),
  addFAQValidation,
  logActivity('add_faq'),
  faqController.addFAQ
);

// Get FAQs
router.get(
  '/faqs',
  rateLimitPerUser(100, 60 * 60 * 1000),
  paginationValidation,
  logActivity('get_faqs'),
  faqController.getFAQs
);

// Get company documents
router.get(
  '/documents',
  rateLimitPerUser(100, 60 * 60 * 1000),
  paginationValidation,
  query('documentType')
    .optional()
    .isIn(['faq', 'policy', 'guide', 'manual', 'other'])
    .withMessage('Invalid document type'),
  runValidation,
  logActivity('get_documents'),
  faqController.getDocuments
);

// Update an FAQ (Admin only)
router.put(
  '/faqs/:faqId',
  requireAdmin,
  rateLimitPerUser(30, 60 * 60 * 1000),
  updateFAQValidation,
  logActivity('update_faq'),
  faqController.updateFAQ
);

// Delete an FAQ (Admin only)
router.delete(
  '/faqs/:faqId',
  requireAdmin,
  rateLimitPerUser(20, 60 * 60 * 1000),
  param('faqId')
    .isMongoId()
    .withMessage('Invalid FAQ ID format'),
  runValidation,
  logActivity('delete_faq'),
  faqController.deleteFAQ
);

// Delete a document
router.delete(
  '/documents/:documentId',
  rateLimitPerUser(20, 60 * 60 * 1000),
  param('documentId')
    .isMongoId()
    .withMessage('Invalid document ID format'),
  runValidation,
  logActivity('delete_document'),
  faqController.deleteDocument
);

// Get categories
router.get(
  '/categories',
  rateLimitPerUser(50, 60 * 60 * 1000),
  logActivity('get_categories'),
  faqController.getCategories
);

// Get usage stats (Admin only)
router.get(
  '/usage-stats',
  requireAdmin,
  rateLimitPerUser(20, 60 * 60 * 1000),
  logActivity('get_usage_stats'),
  faqController.getUsageStats
);

// Development/Testing
if (process.env.NODE_ENV === 'development') {
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'FAQ Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      user: req.user.username,
      userRole: req.user.role,
      environment: process.env.NODE_ENV
    });
  });

  router.post(
    '/test-extraction',
    requireAdmin,
    uploadMultiple,
    async (req, res) => {
      try {
        const pdfParser = require('../utils/pdfParser');
        const path = require('path');

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = [];
        for (const file of req.files) {
          const extractionResult = await pdfParser.extractText(
            file.path,
            path.extname(file.originalname).substring(1)
          );
          results.push({
            filename: file.originalname,
            extraction: extractionResult
          });
        }

        res.json({
          success: true,
          message: 'Text extraction test completed',
          data: results
        });
      } catch (error) {
        res.status(500).json({
          error: 'Extraction test failed',
          details: error.message
        });
      }
    }
  );
}

// FAQ-specific error handling middleware
router.use((error, req, res, next) => {
  console.error('FAQ route error:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      code: 'FILE_TOO_LARGE',
      message: 'Maximum file size is 10MB'
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      code: 'TOO_MANY_FILES',
      message: 'Maximum 5 files per upload'
    });
  }

  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Invalid file type',
      code: 'INVALID_FILE_TYPE',
      message: 'Only PDF, TXT, DOC, DOCX, and images are allowed'
    });
  }

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  res.status(500).json({
    error: 'FAQ service error',
    code: 'FAQ_SERVICE_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;
