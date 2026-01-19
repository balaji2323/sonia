const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { 
  authenticateToken, 
  rateLimitPerUser,
  logActivity 
} = require('../middleware/authMiddleware');

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
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  runValidation
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  runValidation
];

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),

  runValidation
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number'),

  runValidation
];

// Public routes (no authentication required)

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', 
  rateLimitPerUser(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  registerValidation,
  logActivity('user_registration'),
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', 
  rateLimitPerUser(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  loginValidation,
  logActivity('user_login'),
  authController.login
);

// Protected routes (authentication required)

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', 
  authenticateToken,
  logActivity('get_profile'),
  authController.getProfile
);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', 
  authenticateToken,
  rateLimitPerUser(20, 60 * 60 * 1000), // 20 updates per hour
  updateProfileValidation,
  logActivity('update_profile'),
  authController.updateProfile
);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', 
  authenticateToken,
  rateLimitPerUser(5, 60 * 60 * 1000), // 5 password changes per hour
  changePasswordValidation,
  logActivity('change_password'),
  authController.changePassword
);

// @route   POST /api/auth/refresh-token
// @desc    Refresh authentication token
// @access  Private
router.post('/refresh-token', 
  authenticateToken,
  rateLimitPerUser(50, 60 * 60 * 1000), // 50 refreshes per hour
  logActivity('refresh_token'),
  authController.refreshToken
);

// @route   POST /api/auth/logout
// @desc    Logout user (mainly for client-side cleanup)
// @access  Private
router.post('/logout', 
  authenticateToken,
  logActivity('user_logout'),
  authController.logout
);

// Development/Testing routes (only available in development)
if (process.env.NODE_ENV === 'development') {
  
  // @route   GET /api/auth/test
  // @desc    Test authentication middleware
  // @access  Private
  router.get('/test', 
    authenticateToken,
    (req, res) => {
      res.json({
        success: true,
        message: 'Authentication working correctly',
        user: req.user,
        timestamp: new Date().toISOString()
      });
    }
  );

  // @route   GET /api/auth/health
  // @desc    Health check for auth service
  // @access  Public
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      service: 'Authentication Service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });
}

// Error handling middleware specific to auth routes
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      error: `${field} already exists`,
      code: 'DUPLICATE_FIELD',
      field
    });
  }

  // Generic error response
  res.status(500).json({
    error: 'Authentication service error',
    code: 'AUTH_SERVICE_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;
