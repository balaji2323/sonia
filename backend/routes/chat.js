const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();

const chatController = require('../controllers/chatController');
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
const sendMessageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters'),
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid conversation ID format'),
  runValidation
];

const createConversationValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  runValidation
];

const updateConversationValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('status')
    .optional()
    .isIn(['active', 'closed', 'archived'])
    .withMessage('Status must be active, closed, or archived'),
  runValidation
];

const conversationParamValidation = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),
  runValidation
];

const feedbackValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
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
  runValidation
];

// FIXED: Health check endpoint BEFORE authentication - no token required
router.get('/health', (req, res) => {
  try {
    const openaiService = require('../services/openaiService');
    
    const healthData = {
      success: true,
      message: 'Chat service is healthy',
      timestamp: new Date().toISOString(),
      aiService: {
        isMockMode: openaiService.isMockMode,
        status: openaiService.getStatus()
      },
      database: {
        status: 'connected',
        name: 'chat-service'
      },
      server: {
        status: 'running',
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// All OTHER routes require authentication (moved AFTER health check)
router.use(authenticateToken);

// Create a new conversation
router.post(
  '/conversations',
  rateLimitPerUser(100, 60 * 60 * 1000),
  createConversationValidation,
  logActivity('create_conversation'),
  chatController.createConversation
);

// Send a message and get AI response
router.post(
  '/messages',
  rateLimitPerUser(200, 60 * 60 * 1000),
  sendMessageValidation,
  logActivity('send_message'),
  chatController.sendMessage
);

// Get all conversations
router.get(
  '/conversations',
  rateLimitPerUser(100, 60 * 60 * 1000),
  paginationValidation,
  logActivity('get_conversations'),
  chatController.getConversations
);

// Get a specific conversation
router.get(
  '/conversations/:conversationId',
  rateLimitPerUser(200, 60 * 60 * 1000),
  conversationParamValidation,
  logActivity('get_conversation'),
  chatController.getConversation
);

// Update conversation details
router.put(
  '/conversations/:conversationId',
  rateLimitPerUser(50, 60 * 60 * 1000),
  conversationParamValidation,
  updateConversationValidation,
  logActivity('update_conversation'),
  chatController.updateConversation
);

// Delete a conversation
router.delete(
  '/conversations/:conversationId',
  rateLimitPerUser(20, 60 * 60 * 1000),
  conversationParamValidation,
  logActivity('delete_conversation'),
  chatController.deleteConversation
);

// Export conversation as text or PDF
router.get(
  '/conversations/:conversationId/export',
  rateLimitPerUser(10, 60 * 60 * 1000),
  conversationParamValidation,
  query('format')
    .optional()
    .isIn(['txt', 'pdf'])
    .withMessage('Format must be txt or pdf'),
  runValidation,
  logActivity('export_conversation'),
  chatController.exportConversation
);

// Submit feedback for a conversation
router.post(
  '/conversations/:conversationId/feedback',
  rateLimitPerUser(20, 60 * 60 * 1000),
  conversationParamValidation,
  feedbackValidation,
  logActivity('submit_feedback'),
  chatController.submitFeedback
);

// Development/Testing routes
if (process.env.NODE_ENV === 'development') {
  router.post('/test-ai', async (req, res) => {
    try {
      const openaiService = require('../services/openaiService');
      const testResult = await openaiService.testConnection();
      res.json({
        success: true,
        message: 'OpenAI connection test',
        data: testResult
      });
    } catch (error) {
      res.status(500).json({
        error: 'AI service test failed',
        details: error.message
      });
    }
  });
}

// Chat-specific error handling middleware
router.use((error, req, res, next) => {
  console.error('Chat route error:', error);

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

  if (error.message && error.message.includes('OpenAI')) {
    return res.status(503).json({
      error: 'AI service temporarily unavailable',
      code: 'AI_SERVICE_ERROR',
      message: 'Please try again in a moment'
    });
  }

  res.status(500).json({
    error: 'Chat service error',
    code: 'CHAT_SERVICE_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;
