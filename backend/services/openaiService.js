// Enhanced OpenAI Service with better error handling and mock responses
const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    // Check if OpenAI API key is provided
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY environment variable is not set. Using mock responses.');
      this.useMockResponse = true;
    } else {
      this.useMockResponse = false;
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    this.systemPrompt = `You are a helpful customer support assistant. Provide accurate, polite, and concise responses based on the available company information. If you don't have specific information about a topic, politely direct the user to contact support directly.`;
    this.maxTokens = 800;
    this.temperature = 0.3;
    
    // Rate limiting tracking
    this.rateLimitedUntil = null;
    this.failureCount = 0;
    this.maxFailures = 3;
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Check if we're in a rate-limited state
      if (this.rateLimitedUntil && Date.now() < this.rateLimitedUntil) {
        const remainingTime = Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
        console.log(`⏳ Still rate limited for ${remainingTime} seconds`);
        return this.getMockResponse(userMessage, 'Rate limited');
      }

      // If no API key or too many failures, return mock response
      if (this.useMockResponse || this.failureCount >= this.maxFailures) {
        return this.getMockResponse(userMessage);
      }

      // Search for relevant FAQ and company data
      const relevantContext = await this.getRelevantContext(userMessage);

      // Prepare messages for OpenAI
      const messages = [
        { role: 'system', content: this.systemPrompt + (relevantContext ? `\n\nRelevant information:\n${relevantContext}` : '') }
      ];

      // Add conversation history (last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        if (msg.sender && msg.content && msg.sender !== 'system') {
          messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Call OpenAI API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const choice = response.choices[0]?.message;
      if (!choice) {
        throw new Error('No response from OpenAI');
      }

      // Reset failure count on success
      this.failureCount = 0;
      this.rateLimitedUntil = null;

      return {
        response: choice.content,
        metadata: {
          model: response.model,
          tokens: response.usage?.total_tokens || 0,
          confidence: relevantContext ? 0.8 : 0.5,
          contextUsed: !!relevantContext,
          isMock: false
        }
      };

    } catch (error) {
      console.error('❌ OpenAI Service error:', error.message);
      
      // Handle specific OpenAI errors
      if (error.status === 401) {
        console.error('🔑 OpenAI API key is invalid');
        this.useMockResponse = true;
        return this.getMockResponse(userMessage, 'Invalid API key');
      } else if (error.status === 429) {
        // Rate limit exceeded
        const retryAfter = error.headers?.['retry-after'] || 60;
        this.rateLimitedUntil = Date.now() + (retryAfter * 1000);
        console.error(`⏳ OpenAI API rate limit exceeded. Retry after ${retryAfter} seconds`);
        return this.getMockResponse(userMessage, 'Rate limit exceeded');
      } else if (error.status === 500 || error.status === 502 || error.status === 503) {
        console.error('🚨 OpenAI service is temporarily unavailable');
        this.failureCount++;
        return this.getMockResponse(userMessage, 'Service unavailable');
      } else if (error.name === 'AbortError') {
        console.error('⏰ OpenAI request timed out');
        return this.getMockResponse(userMessage, 'Request timeout');
      }

      // Increment failure count for other errors
      this.failureCount++;
      
      // Return mock response as fallback
      return this.getMockResponse(userMessage, 'Service error');
    }
  }

  getMockResponse(userMessage, errorType = null) {
    const lowerMessage = userMessage.toLowerCase();
    let response;

    if (errorType) {
      response = `I apologize, but our AI service is currently experiencing issues (${errorType}). However, I'm here to help with some basic information!`;
    }

    // Enhanced keyword-based responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      response = '👋 Hello! Welcome to our customer support. How can I assist you today?';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      response = 'I\'m here to help! You can ask me about:\n• Account issues and login problems\n• Product information and pricing\n• Technical support and troubleshooting\n• Billing and subscription questions\n\nWhat can I help you with?';
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('billing')) {
      response = '💰 For detailed pricing information, please visit our pricing page or contact our sales team at sales@company.com. We offer flexible plans to suit different needs!';
    } else if (lowerMessage.includes('account') || lowerMessage.includes('login') || lowerMessage.includes('password')) {
      response = '🔐 For account-related issues:\n• Reset password: Use "Forgot Password" on the login page\n• Account locked: Contact support\n• Profile updates: Check your account settings\n\nNeed more help? Contact our support team!';
    } else if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('problem')) {
      response = '🐛 I understand you\'re experiencing technical difficulties. To help resolve this:\n1. Try refreshing the page\n2. Clear your browser cache\n3. Check your internet connection\n4. Contact our tech team with specific error details\n\nWhat specific issue are you encountering?';
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('unsubscribe')) {
      response = '❌ To cancel your subscription:\n1. Go to Account Settings\n2. Select "Subscription"\n3. Click "Cancel Subscription"\n\nOr contact our support team for assistance. We\'d love to know how we can improve!';
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email')) {
      response = '📞 You can reach us:\n• Chat: Right here with me!\n• Email: support@company.com\n• Phone: 1-800-SUPPORT (Mon-Fri, 9 AM - 6 PM EST)\n• Help Center: Visit our FAQ section\n\nI\'m available 24/7 for immediate assistance!';
    } else if (lowerMessage.includes('hours') || lowerMessage.includes('time') || lowerMessage.includes('available')) {
      response = '🕒 Our support hours:\n• Chat Support: 24/7 (that\'s me!)\n• Phone Support: Monday-Friday, 9 AM - 6 PM EST\n• Email Support: We respond within 24 hours\n\nHow can I help you right now?';
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      response = '😊 You\'re very welcome! I\'m glad I could help. Is there anything else you need assistance with today?';
    } else if (!response) {
      response = `Thank you for your question! While I don't have specific information about "${userMessage}" right now, I'd be happy to connect you with our support team who can provide more detailed assistance.\n\n📧 Email: support@company.com\n💬 Or continue chatting here - I might be able to help with other questions!`;
    }

    return {
      response,
      metadata: {
        model: 'mock-response',
        tokens: response.length,
        confidence: 0.7,
        contextUsed: true,
        isMock: true,
        errorType
      }
    };
  }

  async getRelevantContext(userMessage, limit = 3) {
    try {
      const searchTerms = userMessage.toLowerCase();
      
      // Enhanced knowledge base - you can expand this
      const knowledgeBase = [
        {
          question: "What are your support hours?",
          answer: "Our chat support is available 24/7. Phone support is Monday-Friday, 9 AM to 6 PM EST.",
          keywords: ["support", "hours", "availability", "time", "phone", "chat"]
        },
        {
          question: "How can I reset my password?",
          answer: "You can reset your password by clicking 'Forgot Password' on the login page, or contact support for assistance.",
          keywords: ["password", "reset", "forgot", "login", "account"]
        },
        {
          question: "How do I contact support?",
          answer: "You can contact support through this chat system, email support@company.com, or call us at 1-800-SUPPORT.",
          keywords: ["contact", "support", "email", "help", "phone", "call"]
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers.",
          keywords: ["payment", "credit card", "paypal", "billing", "pay"]
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can cancel your subscription from your account settings or contact our support team for assistance.",
          keywords: ["cancel", "subscription", "account", "unsubscribe"]
        },
        {
          question: "Is there a mobile app available?",
          answer: "Yes, our mobile app is available for iOS and Android devices. You can download it from the App Store or Google Play.",
          keywords: ["mobile", "app", "ios", "android", "download"]
        }
      ];

      // Simple keyword matching
      const relevantEntries = knowledgeBase
        .filter(entry => 
          entry.keywords.some(keyword => searchTerms.includes(keyword.toLowerCase()))
        )
        .slice(0, limit);

      if (relevantEntries.length === 0) {
        return null;
      }

      let context = "Relevant company information:\n";
      relevantEntries.forEach((entry, index) => {
        context += `${index + 1}. Q: ${entry.question}\n   A: ${entry.answer}\n\n`;
      });

      return context;
    } catch (error) {
      console.error('❌ Error getting relevant context:', error);
      return null;
    }
  }

  // Test connection to OpenAI
  async testConnection() {
    try {
      if (this.useMockResponse) {
        return {
          success: true,
          message: 'Using mock responses (no API key configured)',
          model: 'mock-response'
        };
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });

      return {
        success: true,
        message: 'OpenAI connection successful',
        model: response.model
      };
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error);
      return {
        success: false,
        message: `OpenAI connection failed: ${error.message}`
      };
    }
  }

  // Check if service is using mock responses
  get isMockMode() {
    return this.useMockResponse;
  }

  // Reset rate limiting (for development)
  resetRateLimit() {
    this.rateLimitedUntil = null;
    this.failureCount = 0;
    console.log('🔓 Rate limit reset');
  }

  // Get service status
  getStatus() {
    return {
      isMockMode: this.useMockResponse,
      isRateLimited: this.rateLimitedUntil && Date.now() < this.rateLimitedUntil,
      rateLimitedUntil: this.rateLimitedUntil,
      failureCount: this.failureCount,
      maxFailures: this.maxFailures
    };
  }
}

module.exports = new OpenAIService();
