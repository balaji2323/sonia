const { FAQ, CompanyData } = require('../models/FAQ');
const pdfParser = require('../utils/pdfParser');
const { getFileInfo, deleteFile } = require('../middleware/uploadMiddleware');
const path = require('path');

// Upload and process FAQ/company documents
const uploadDocument = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const { title, category, documentType = 'other', keywords } = req.body;
    const userId = req.userId;

    const processedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const fileInfo = getFileInfo(file);
        
        // Extract text content from the file
        const extractionResult = await pdfParser.extractText(
          file.path, 
          path.extname(file.originalname).substring(1)
        );

        if (!extractionResult.success) {
          errors.push({
            filename: file.originalname,
            error: extractionResult.error
          });
          
          // Clean up failed file
          deleteFile(file.path);
          continue;
        }

        // Extract keywords if not provided
        let processedKeywords = [];
        if (keywords) {
          processedKeywords = keywords.split(',').map(k => k.trim().toLowerCase());
        } else {
          processedKeywords = pdfParser.extractKeywords(extractionResult.text, 10);
        }

        // Create company data record
        const companyData = new CompanyData({
          title: title || file.originalname,
          content: extractionResult.text,
          documentType,
          keywords: processedKeywords,
          category: category ? category.toLowerCase() : 'general',
          fileInfo,
          uploadedBy: userId,
          metadata: {
            confidence: 1.0,
            extractedAt: new Date(),
            processingStatus: 'completed'
          }
        });

        await companyData.save();
        processedFiles.push({
          id: companyData._id,
          title: companyData.title,
          category: companyData.category,
          documentType: companyData.documentType,
          wordCount: extractionResult.metadata?.wordCount || 0,
          keywords: processedKeywords.slice(0, 5) // Return first 5 keywords
        });

      } catch (error) {
        console.error(`Processing error for ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        // Clean up failed file
        deleteFile(file.path);
      }
    }

    const response = {
      success: processedFiles.length > 0,
      message: `Processed ${processedFiles.length} file(s) successfully`,
      data: { processedFiles }
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += `, ${errors.length} file(s) failed`;
    }

    res.status(processedFiles.length > 0 ? 201 : 400).json(response);

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      code: 'UPLOAD_ERROR',
      details: error.message
    });
  }
};

// Add FAQ manually
const addFAQ = async (req, res) => {
  try {
    const { question, answer, keywords, category, priority } = req.body;

    // Validation
    if (!question || !answer || !category) {
      return res.status(400).json({
        error: 'Question, answer, and category are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Process keywords
    let processedKeywords = [];
    if (keywords) {
      if (Array.isArray(keywords)) {
        processedKeywords = keywords.map(k => k.toString().toLowerCase().trim());
      } else {
        processedKeywords = keywords.split(',').map(k => k.trim().toLowerCase());
      }
    } else {
      // Extract keywords from question and answer
      const text = `${question} ${answer}`;
      processedKeywords = pdfParser.extractKeywords(text, 8);
    }

    const faq = new FAQ({
      question: question.trim(),
      answer: answer.trim(),
      keywords: processedKeywords,
      category: category.toLowerCase().trim(),
      priority: priority || 1
    });

    await faq.save();

    res.status(201).json({
      success: true,
      message: 'FAQ added successfully',
      data: { faq }
    });

  } catch (error) {
    console.error('Add FAQ error:', error);
    res.status(500).json({
      error: 'Failed to add FAQ',
      code: 'ADD_FAQ_ERROR',
      details: error.message
    });
  }
};

// Get all FAQs
const getFAQs = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { isActive: true };

    // Filter by category
    if (category) {
      query.category = category.toLowerCase();
    }

    let faqs;
    let total;

    // Search functionality
    if (search) {
      faqs = await FAQ.searchFAQs(search, parseInt(limit));
      total = faqs.length;
    } else {
      faqs = await FAQ.find(query)
        .sort({ priority: -1, usageCount: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      total = await FAQ.countDocuments(query);
    }

    res.json({
      success: true,
      data: {
        faqs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({
      error: 'Failed to get FAQs',
      code: 'GET_FAQS_ERROR'
    });
  }
};

// Get all company documents
const getDocuments = async (req, res) => {
  try {
    const { category, documentType, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { 
      isActive: true,
      'metadata.processingStatus': 'completed'
    };

    // Filters
    if (category) {
      query.category = category.toLowerCase();
    }
    if (documentType) {
      query.documentType = documentType;
    }

    let documents;
    let total;

    // Search functionality
    if (search) {
      documents = await CompanyData.searchCompanyData(search, parseInt(limit));
      total = documents.length;
    } else {
      documents = await CompanyData.find(query)
        .populate('uploadedBy', 'username email')
        .sort({ usageCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      total = await CompanyData.countDocuments(query);
    }

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: 'Failed to get documents',
      code: 'GET_DOCUMENTS_ERROR'
    });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { question, answer, keywords, category, priority, isActive } = req.body;

    const updateData = {};
    if (question) updateData.question = question.trim();
    if (answer) updateData.answer = answer.trim();
    if (category) updateData.category = category.toLowerCase().trim();
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Process keywords
    if (keywords) {
      if (Array.isArray(keywords)) {
        updateData.keywords = keywords.map(k => k.toString().toLowerCase().trim());
      } else {
        updateData.keywords = keywords.split(',').map(k => k.trim().toLowerCase());
      }
    }

    const faq = await FAQ.findByIdAndUpdate(faqId, updateData, { new: true });

    if (!faq) {
      return res.status(404).json({
        error: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'FAQ updated successfully',
      data: { faq }
    });

  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({
      error: 'Failed to update FAQ',
      code: 'UPDATE_FAQ_ERROR'
    });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;

    const faq = await FAQ.findByIdAndDelete(faqId);

    if (!faq) {
      return res.status(404).json({
        error: 'FAQ not found',
        code: 'FAQ_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });

  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({
      error: 'Failed to delete FAQ',
      code: 'DELETE_FAQ_ERROR'
    });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await CompanyData.findById(documentId);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Check if user owns the document or is admin
    if (document.uploadedBy.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Permission denied',
        code: 'PERMISSION_DENIED'
      });
    }

    // Delete file from filesystem
    if (document.fileInfo && document.fileInfo.filePath) {
      deleteFile(document.fileInfo.filePath);
    }

    // Delete document record
    await CompanyData.findByIdAndDelete(documentId);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      code: 'DELETE_DOCUMENT_ERROR'
    });
  }
};

// Get FAQ/document categories
const getCategories = async (req, res) => {
  try {
    const [faqCategories, docCategories] = await Promise.all([
      FAQ.distinct('category', { isActive: true }),
      CompanyData.distinct('category', { 
        isActive: true,
        'metadata.processingStatus': 'completed'
      })
    ]);

    const allCategories = [...new Set([...faqCategories, ...docCategories])];

    res.json({
      success: true,
      data: {
        categories: allCategories,
        faqCategories,
        documentCategories: docCategories
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      code: 'GET_CATEGORIES_ERROR'
    });
  }
};

// Get usage statistics
const getUsageStats = async (req, res) => {
  try {
    const [faqStats, docStats] = await Promise.all([
      FAQ.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalFAQs: { $sum: 1 },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' }
          }
        }
      ]),
      CompanyData.aggregate([
        { 
          $match: { 
            isActive: true,
            'metadata.processingStatus': 'completed'
          } 
        },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalUsage: { $sum: '$usageCount' },
            avgUsage: { $avg: '$usageCount' }
          }
        }
      ])
    ]);

    // Get popular items
    const [popularFAQs, popularDocs] = await Promise.all([
      FAQ.getPopular(5),
      CompanyData.find({ 
        isActive: true,
        'metadata.processingStatus': 'completed'
      })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('title category usageCount lastUsed')
    ]);

    res.json({
      success: true,
      data: {
        faqs: faqStats[0] || { totalFAQs: 0, totalUsage: 0, avgUsage: 0 },
        documents: docStats[0] || { totalDocuments: 0, totalUsage: 0, avgUsage: 0 },
        popular: {
          faqs: popularFAQs,
          documents: popularDocs
        }
      }
    });

  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      error: 'Failed to get usage statistics',
      code: 'GET_STATS_ERROR'
    });
  }
};

module.exports = {
  uploadDocument,
  addFAQ,
  getFAQs,
  getDocuments,
  updateFAQ,
  deleteFAQ,
  deleteDocument,
  getCategories,
  getUsageStats
};