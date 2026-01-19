const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  answer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  keywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  }
});

const companyDataSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  documentType: {
    type: String,
    enum: ['faq', 'policy', 'guide', 'manual', 'other'],
    default: 'other'
  },
  keywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  fileInfo: {
    originalName: String,
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  metadata: {
    confidence: {
      type: Number,
      default: 0
    },
    extractedAt: {
      type: Date,
      default: Date.now
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// Text search indexes
companyDataSchema.index({ 
  title: 'text', 
  content: 'text', 
  keywords: 'text' 
});

faqItemSchema.index({ 
  question: 'text', 
  answer: 'text', 
  keywords: 'text' 
});

// Method to search FAQs by text
faqItemSchema.statics.searchFAQs = function(searchTerm, limit = 5) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { question: { $regex: searchTerm, $options: 'i' } },
          { answer: { $regex: searchTerm, $options: 'i' } },
          { keywords: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  })
  .sort({ priority: -1, usageCount: -1 })
  .limit(limit);
};

// Method to search company data
companyDataSchema.statics.searchCompanyData = function(searchTerm, limit = 5) {
  return this.find({
    $and: [
      { isActive: true },
      { 'metadata.processingStatus': 'completed' },
      {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { content: { $regex: searchTerm, $options: 'i' } },
          { keywords: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  })
  .sort({ usageCount: -1, createdAt: -1 })
  .limit(limit);
};

// Method to increment usage count
faqItemSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

companyDataSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Method to get popular FAQs
faqItemSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ usageCount: -1, priority: -1 })
    .limit(limit);
};

// Method to get FAQs by category
faqItemSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category: category.toLowerCase(), 
    isActive: true 
  }).sort({ priority: -1, usageCount: -1 });
};

// Indexes for better performance
faqItemSchema.index({ category: 1, isActive: 1 });
faqItemSchema.index({ usageCount: -1 });
faqItemSchema.index({ priority: -1 });

companyDataSchema.index({ category: 1, isActive: 1 });
companyDataSchema.index({ usageCount: -1 });
companyDataSchema.index({ 'metadata.processingStatus': 1 });
companyDataSchema.index({ uploadedBy: 1 });

const FAQ = mongoose.model('FAQ', faqItemSchema);
const CompanyData = mongoose.model('CompanyData', companyDataSchema);

module.exports = { FAQ, CompanyData };