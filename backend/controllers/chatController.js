const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const openaiService = require('../services/openaiService');

// Create a new conversation
const createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.userId;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Create new conversation
    const conversation = new Conversation({
      userId,
      sessionId: uuidv4(),
      title: title || 'New Conversation',
      messages: [],
      status: 'active'
    });

    await conversation.save();
    
    // Populate user data for response
    await conversation.populate('userId', 'username email');

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversation: {
          id: conversation._id,
          sessionId: conversation.sessionId,
          title: conversation.title,
          status: conversation.status,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          lastActivity: conversation.lastActivity,
          user: {
            id: conversation.userId._id,
            username: conversation.userId.username,
            email: conversation.userId.email
          }
        }
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      code: 'CREATE_CONVERSATION_ERROR',
      details: error.message
    });
  }
};

// Send a message and get AI response
const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.userId;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message content is required',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: 'Message too long. Maximum 4000 characters allowed.',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    let conversation;

    // Find existing conversation or create new one
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        });
      }
    } else {
      // Create new conversation automatically
      conversation = new Conversation({
        userId,
        sessionId: uuidv4(),
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        status: 'active'
      });
    }

    // Add user message
    const userMessage = {
      sender: 'user',
      content: message.trim(),
      timestamp: new Date(),
      messageType: 'text'
    };
    conversation.messages.push(userMessage);

    // Get AI response
    try {
      const aiResponse = await openaiService.generateResponse(
        message, 
        conversation.messages.slice(-10) // Last 10 messages for context
      );

      const botMessage = {
        sender: 'bot',
        content: aiResponse.response,
        timestamp: new Date(),
        messageType: 'text',
        metadata: aiResponse.metadata
      };

      conversation.messages.push(botMessage);
      conversation.lastActivity = new Date();
      
      await conversation.save();

      // Populate user data
      await conversation.populate('userId', 'username email');

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          conversation: {
            id: conversation._id,
            sessionId: conversation.sessionId,
            title: conversation.title,
            messages: conversation.messages,
            lastActivity: conversation.lastActivity
          },
          userMessage,
          botMessage,
          metadata: aiResponse.metadata
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Still save the user message even if AI fails
      conversation.lastActivity = new Date();
      await conversation.save();

      const errorMessage = {
        sender: 'bot',
        content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a moment.',
        timestamp: new Date(),
        messageType: 'text',
        metadata: { error: true }
      };

      conversation.messages.push(errorMessage);
      await conversation.save();

      res.json({
        success: true,
        message: 'Message sent, but AI response failed',
        data: {
          conversation: {
            id: conversation._id,
            sessionId: conversation.sessionId,
            title: conversation.title,
            messages: conversation.messages,
            lastActivity: conversation.lastActivity
          },
          userMessage,
          botMessage: errorMessage,
          metadata: { aiError: true }
        }
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      code: 'SEND_MESSAGE_ERROR',
      details: error.message
    });
  }
};

// Get a single conversation
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOne({ _id: conversationId, userId })
      .populate('userId', 'username email');

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation._id,
          sessionId: conversation.sessionId,
          title: conversation.title,
          status: conversation.status,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          lastActivity: conversation.lastActivity,
          user: {
            id: conversation.userId._id,
            username: conversation.userId.username,
            email: conversation.userId.email
          }
        }
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: 'Failed to get conversation',
      code: 'GET_CONVERSATION_ERROR',
      details: error.message
    });
  }
};

// Get all conversations for a user
const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({ userId })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email');

    const total = await Conversation.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => ({
          id: conv._id,
          sessionId: conv.sessionId,
          title: conv.title,
          status: conv.status,
          messageCount: conv.messages.length,
          lastActivity: conv.lastActivity,
          createdAt: conv.createdAt
        })),
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      error: 'Failed to get conversations',
      code: 'GET_CONVERSATIONS_ERROR',
      details: error.message
    });
  }
};

// Update conversation details
const updateConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title, tags, status } = req.body;
    const userId = req.userId;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (tags) updateData.tags = tags;
    if (status) updateData.status = status;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId },
      updateData,
      { new: true }
    ).populate('userId', 'username email');

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: { conversation }
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      error: 'Failed to update conversation',
      code: 'UPDATE_CONVERSATION_ERROR',
      details: error.message
    });
  }
};

// Delete a conversation
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findOneAndDelete({ _id: conversationId, userId });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      code: 'DELETE_CONVERSATION_ERROR',
      details: error.message
    });
  }
};

// Export conversation as text
const exportConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const format = req.query.format || 'txt';
    const userId = req.userId;

    const conversation = await Conversation.findOne({ _id: conversationId, userId })
      .populate('userId', 'username email');

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    let content = `Title: ${conversation.title}\n`;
    content += `Date: ${conversation.createdAt.toLocaleString()}\n\n`;

    conversation.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const sender = msg.sender === 'user' ? conversation.userId.username : 'Assistant';
      content += `[${timestamp}] ${sender}: ${msg.content}\n\n`;
    });

    const filename = `conv_${conversation._id}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } catch (error) {
    console.error('Export conversation error:', error);
    res.status(500).json({
      error: 'Failed to export conversation',
      code: 'EXPORT_CONVERSATION_ERROR',
      details: error.message
    });
  }
};

// Submit feedback for a conversation
const submitFeedback = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5',
        code: 'INVALID_RATING'
      });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId },
      {
        'feedback.rating': rating,
        'feedback.comment': comment || '',
        'feedback.submittedAt': new Date()
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback: conversation.feedback
      }
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      code: 'SUBMIT_FEEDBACK_ERROR',
      details: error.message
    });
  }
};

// Socket.IO handlers
const socketHandlers = {
  handleNewMessage: async (socket, io, data) => {
    try {
      const { message, conversationId, userId } = data;

      // Emit typing indicator
      socket.to(userId).emit('botTyping', { conversationId });

      let conversation = await Conversation.findOne({ _id: conversationId, userId });
      
      if (!conversation) {
        // Create new conversation if none exists
        conversation = new Conversation({
          userId,
          sessionId: uuidv4(),
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          messages: [],
          status: 'active'
        });
      }

      // Add user message
      const userMessage = {
        sender: 'user',
        content: message.trim(),
        timestamp: new Date(),
        messageType: 'text'
      };
      conversation.messages.push(userMessage);
      socket.emit('messageSent', { message: userMessage });

      // Get AI response
      try {
        const aiResponse = await openaiService.generateResponse(message, conversation.messages);
        
        const botMessage = {
          sender: 'bot',
          content: aiResponse.response,
          timestamp: new Date(),
          messageType: 'text',
          metadata: aiResponse.metadata
        };

        conversation.messages.push(botMessage);
        conversation.lastActivity = new Date();
        await conversation.save();

        // Stop typing indicator
        socket.to(userId).emit('botStoppedTyping', { conversationId });
        socket.emit('botMessage', { message: botMessage, metadata: aiResponse.metadata });
      } catch (aiError) {
        console.error('Socket AI error:', aiError);
        socket.to(userId).emit('botStoppedTyping', { conversationId });
        
        const errorMessage = {
          sender: 'bot',
          content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a moment.',
          timestamp: new Date(),
          messageType: 'text',
          metadata: { error: true }
        };
        
        conversation.messages.push(errorMessage);
        await conversation.save();
        
        socket.emit('botMessage', { message: errorMessage, metadata: { error: true } });
      }
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  }
};

module.exports = {
  createConversation,
  sendMessage,
  getConversation,
  getConversations,
  updateConversation,
  deleteConversation,
  exportConversation,
  submitFeedback,
  socketHandlers
};