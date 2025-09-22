const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    confidence: Number,
    model: String,
    tokens: Number
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    maxlength: 100
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  summary: {
    type: String,
    maxlength: 500,
    default: null
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      maxlength: 1000,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.messageCount = ret.messages.length;
      return ret;
    }
  }
});

// Update lastActivity on message addition
conversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastActivity = new Date();
  return this.save();
};

// Get conversation summary
conversationSchema.methods.getSummary = function() {
  const userMessages = this.messages.filter(msg => msg.sender === 'user').length;
  const botMessages = this.messages.filter(msg => msg.sender === 'bot').length;
  
  return {
    totalMessages: this.messages.length,
    userMessages,
    botMessages,
    duration: this.lastActivity - this.createdAt,
    status: this.status,
    resolved: this.resolved
  };
};

// Find active conversations
conversationSchema.statics.findActive = function(userId) {
  return this.find({ 
    userId, 
    status: 'active' 
  }).sort({ lastActivity: -1 });
};

// Find recent conversations
conversationSchema.statics.findRecent = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ lastActivity: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

// Indexes for better performance
conversationSchema.index({ userId: 1, lastActivity: -1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ status: 1, lastActivity: -1 });
conversationSchema.index({ tags: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);