const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const faqRoutes = require('./routes/faq');

// Import socket handlers
const { socketHandlers } = require('./controllers/chatController');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

// FIXED: Enhanced Socket.IO setup with better error handling
const io = socketIo(server, {
  path: '/socket.io/',            // ensure client and server match
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Allow both transports instead of websocket only
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true, // Enable compatibility
  allowRequest: (req, callback) => {
    // Additional security check
    callback(null, true);
  }
});

// FIXED: Middleware setup
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// FIXED: More lenient rate limiting for development
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    error: message,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development mode
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    // Skip for health checks
    if (req.path === '/health' || req.path === '/api/health') {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    const retryAfterSeconds = Math.ceil(windowMs / 1000);
    console.log(`⚠️ Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    
    res.status(429).json({
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSeconds,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
});

// FIXED: More generous limits for development
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 requests in dev, 100 in prod
  'Too many requests from this IP, please try again later.'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 50 : 5, // 50 attempts in dev, 5 in prod
  'Too many authentication attempts, please try again later.'
);

// Apply rate limiting conditionally
if (process.env.NODE_ENV !== 'development') {
  // Only apply strict rate limiting in production
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use(generalLimiter);
  console.log('🔒 Rate limiting enabled for production');
} else {
  console.log('⚠️ Rate limiting disabled in development mode');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// FIXED: Health check endpoint - MOVED TO TOP
app.get('/health', (req, res) => {
  try {
    const healthData = {
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      server: {
        status: 'running',
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.db?.databaseName || 'unknown'
      },
      services: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          keyFormat: process.env.OPENAI_API_KEY?.startsWith('sk-') ? 'valid' : 'invalid'
        },
        jwt: {
          configured: !!process.env.JWT_SECRET
        }
      },
      // ADDED: Show test credentials in development
      ...(process.env.NODE_ENV === 'development' && {
        testCredentials: {
          admin: { email: 'admin@example.com', password: 'admin123' },
          user: { email: 'test@example.com', password: 'test123' }
        }
      })
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

// ADDED: Simple health endpoint as backup
app.get('/api/health', (req, res) => {
  res.redirect(301, '/health'); // Redirect to main health endpoint
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/faq', faqRoutes);

// FIXED: Socket.IO authentication middleware with better error handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('Socket connection attempt without token');
      return next(new Error('Authentication error: No token provided'));
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.authenticated = true;
    
    console.log(`Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    next(new Error('Authentication failed'));
  }
});

// FIXED: Socket.IO connection handling with better error handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}, User ID: ${socket.userId}`);

  // Emit connection confirmation immediately
  socket.emit('connected', { 
    message: 'Connected to chat server',
    userId: socket.userId,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  if (socket.userId) {
    socket.join(socket.userId.toString());
    console.log(`User ${socket.userId} joined room: ${socket.userId}`);
  }

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error(`Connection error for user ${socket.userId}:`, error);
  });

  socket.on('joinConversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
      socket.emit('joinedConversation', { conversationId });
    }
  });

  socket.on('leaveConversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} left conversation: ${conversationId}`);
      socket.emit('leftConversation', { conversationId });
    }
  });

  // FIXED: Better error handling for newMessage
  socket.on('newMessage', async (data) => {
    try {
      if (!socket.authenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      console.log(`Processing new message from user ${socket.userId}`);

      const messageData = {
        ...data,
        userId: socket.userId
      };

      // Check if socketHandlers exists
      if (socketHandlers && socketHandlers.handleNewMessage) {
        await socketHandlers.handleNewMessage(socket, io, messageData);
      } else {
        console.error('socketHandlers.handleNewMessage not found');
        socket.emit('error', { message: 'Message handler not available' });
      }
    } catch (error) {
      console.error('New message error:', error);
      socket.emit('error', { 
        message: 'Failed to process message',
        details: error.message 
      });
    }
  });

  // ADDED: Handle ping/heartbeat from client
  socket.on('ping', (data) => {
    socket.emit('heartbeat', { 
      timestamp: new Date().toISOString(),
      received: data?.timestamp
    });
  });

  socket.on('typing', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('userTyping', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    }
  });

  socket.on('stopTyping', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('userStoppedTyping', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    }
  });

  // FIXED: Better disconnect handling - remove duplicate handler
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.id}, Reason: ${reason}`);
    
    // Clear heartbeat interval if it exists
    if (socket.heartbeatInterval) {
      clearInterval(socket.heartbeatInterval);
    }
    
    if (socket.userId) {
      socket.broadcast.emit('userOffline', { userId: socket.userId });
    }

    // Attempt to reconnect for certain disconnect reasons
    if (reason === 'io server disconnect') {
      console.log('Server initiated disconnect, client should reconnect');
    }
  });

  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
    socket.emit('serverError', { 
      message: 'Socket error occurred',
      timestamp: new Date().toISOString()
    });
  });

  // FIXED: Send periodic heartbeat - store interval reference
  socket.heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: new Date().toISOString() });
    } else {
      clearInterval(socket.heartbeatInterval);
    }
  }, 30000); // Every 30 seconds
});

// FIXED: Database connection with better error handling and retry logic
const connectDB = async (retries = 5) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Attempting to connect to MongoDB Atlas...');

    // Simple connection with default options
    await mongoose.connect(mongoURI);

    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB Atlas connection error (attempt ${6 - retries}/5):`, error.message);
    
    if (retries > 1) {
      console.log(`🔄 Retrying in 5 seconds...`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('❌ Failed to connect to MongoDB Atlas after 5 attempts');
      
      // Print helpful debug info
      console.log('🔍 Debug information:');
      console.log('   MongoDB URI (masked):', mongoURI.replace(/:([^:@]{8})[^:@]*@/, ':****@'));
      console.log('   Mongoose version:', mongoose.version);
      console.log('   Node.js version:', process.version);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Development mode - server continuing without database');
      } else {
        process.exit(1);
      }
    }
  }
};

// ADDED: Create default admin user for development and testing
const createDefaultUsers = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      const User = require('./models/User');
      
      console.log('🔧 Checking for default users...');
      
      // Check if admin user exists
      const adminExists = await User.findOne({ email: 'admin@example.com' });
      
      if (!adminExists) {
        const defaultAdmin = new User({
          username: 'admin',
          email: 'admin@example.com',
          password: 'admin123', // Will be hashed by pre-save middleware
          role: 'admin'
        });
        
        await defaultAdmin.save();
        console.log('✅ Default admin user created');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: admin123');
        console.log('👑 Role: admin');
      } else {
        console.log('👤 Admin user already exists');
      }
      
      // Check if test user exists
      const testUserExists = await User.findOne({ email: 'test@example.com' });
      
      if (!testUserExists) {
        const testUser = new User({
          username: 'testuser',
          email: 'test@example.com',
          password: 'test123',
          role: 'user'
        });
        
        await testUser.save();
        console.log('✅ Default test user created');
        console.log('📧 Email: test@example.com');
        console.log('🔑 Password: test123');
        console.log('👤 Role: user');
      } else {
        console.log('👤 Test user already exists');
      }

      // Create additional test users for variety
      const testUsers = [
        { username: 'john', email: 'john@example.com', password: 'john123', role: 'user' },
        { username: 'jane', email: 'jane@example.com', password: 'jane123', role: 'user' },
        { username: 'demo', email: 'demo@example.com', password: 'demo123', role: 'user' }
      ];

      for (const userData of testUsers) {
        const userExists = await User.findOne({ email: userData.email });
        if (!userExists) {
          const newUser = new User(userData);
          await newUser.save();
          console.log(`✅ Test user created: ${userData.email} / ${userData.password}`);
        }
      }

      console.log('\n🎯 Available test accounts:');
      console.log('   👑 Admin: admin@example.com / admin123');
      console.log('   👤 User: test@example.com / test123');
      console.log('   👤 User: john@example.com / john123');
      console.log('   👤 User: jane@example.com / jane123');
      console.log('   👤 User: demo@example.com / demo123');
      console.log('');
    } else {
      console.log('🔒 Production mode - skipping default user creation');
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error.message);
    // Don't crash the server if user creation fails
    console.log('⚠️ Continuing without default users...');
  }
};

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'POST /api/chat/conversations',
      'POST /api/chat/messages',
      'GET /api/chat/conversations',
      'GET /health'
    ]
  });
});

// FIXED: Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_ID',
      details: error.message
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      code: 'FILE_TOO_LARGE',
      details: 'Maximum file size exceeded'
    });
  }

  // FIXED: Handle OpenAI specific errors
  if (error.message && error.message.includes('OpenAI')) {
    return res.status(503).json({
      error: 'AI service temporarily unavailable',
      code: 'AI_SERVICE_ERROR',
      details: 'Please try again in a moment'
    });
  }

  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? error.message 
    : 'Internal server error';

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Close Socket.IO connections
  io.close(() => {
    console.log('🔴 Socket.IO closed');
  });
  
  server.close(() => {
    console.log('🔴 HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('🔴 MongoDB connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ADDED: Test AI connection function
const testAIConnection = async () => {
  try {
    // Check if we can import the OpenAI service
    const openaiService = require('./services/openaiService');
    
    if (openaiService && openaiService.testConnection) {
      const testResult = await openaiService.testConnection();
      if (testResult.success) {
        console.log('✅ OpenAI Service:', testResult.message);
      } else {
        console.log('⚠️ OpenAI Service:', testResult.message);
      }
    } else {
      console.log('⚠️ OpenAI Service: Using mock responses (service not configured)');
    }
  } catch (error) {
    console.log('⚠️ OpenAI Service: Using mock responses (' + error.message + ')');
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Create default users for development
    await createDefaultUsers();
    
    // Start server
    server.listen(PORT, () => {
      console.log('\n🚀 Server running on port', PORT);
      console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
      console.log('🔗 Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:3000');
      
      console.log('\n📋 Available API endpoints:');
      console.log('   - GET  /health                    (Health check)');
      console.log('   - POST /api/auth/register         (User registration)');
      console.log('   - POST /api/auth/login            (User login)');
      console.log('   - GET  /api/auth/profile          (Get user profile)');
      console.log('   - POST /api/chat/conversations    (Create conversation)');
      console.log('   - GET  /api/chat/conversations    (List conversations)');
      console.log('   - POST /api/chat/messages         (Send message)');
      console.log('   - POST /api/faq/upload            (Upload FAQ files)');
      console.log('\n🔌 WebSocket path: /socket.io/');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n🔓 Development Features:');
        console.log('   - Rate limiting disabled');
        console.log('   - Default users created');
        console.log('   - Enhanced error logging');
        console.log('   - Test credentials in health endpoint');
      }
      
      console.log('\n✅ Server started successfully!\n');

      // Test OpenAI connection on startup
      testAIConnection();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// FIXED: Start the server
startServer();

module.exports = { app, server, io };
