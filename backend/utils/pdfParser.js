const fs = require('fs');
const pdfParse = require('pdf-parse');

class PDFParser {
  constructor() {
    this.supportedFormats = ['pdf', 'txt'];
  }

  /**
   * Extract text content from a PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} - Object containing extracted text and metadata
   */
  async extractTextFromPDF(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      // Clean and process the extracted text
      const cleanedText = this.cleanText(data.text);
      
      // Extract metadata
      const metadata = {
        pages: data.numpages,
        info: data.info,
        extractedAt: new Date(),
        fileSize: fs.statSync(filePath).size,
        wordCount: this.countWords(cleanedText),
        characterCount: cleanedText.length
      };

      return {
        success: true,
        text: cleanedText,
        metadata: metadata,
        originalText: data.text // Keep original for comparison
      };

    } catch (error) {
      console.error('PDF parsing error:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: null
      };
    }
  }

  /**
   * Extract text content from a plain text file
   * @param {string} filePath - Path to the text file
   * @returns {Promise<Object>} - Object containing extracted text and metadata
   */
  async extractTextFromTXT(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const text = fs.readFileSync(filePath, 'utf8');
      const cleanedText = this.cleanText(text);

      const metadata = {
        extractedAt: new Date(),
        fileSize: fs.statSync(filePath).size,
        wordCount: this.countWords(cleanedText),
        characterCount: cleanedText.length,
        lineCount: text.split('\n').length
      };

      return {
        success: true,
        text: cleanedText,
        metadata: metadata,
        originalText: text
      };

    } catch (error) {
      console.error('TXT parsing error:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: null
      };
    }
  }

  /**
   * Main method to extract text from supported file types
   * @param {string} filePath - Path to the file
   * @param {string} fileType - Type of the file (pdf, txt, etc.)
   * @returns {Promise<Object>} - Extraction result
   */
  async extractText(filePath, fileType = null) {
    try {
      // Determine file type if not provided
      if (!fileType) {
        fileType = this.getFileType(filePath);
      }

      fileType = fileType.toLowerCase();

      switch (fileType) {
        case 'pdf':
          return await this.extractTextFromPDF(filePath);
        case 'txt':
          return await this.extractTextFromTXT(filePath);
        default:
          return {
            success: false,
            error: `Unsupported file type: ${fileType}`,
            text: '',
            metadata: null
          };
      }

    } catch (error) {
      console.error('Text extraction error:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: null
      };
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    if (!text) return '';

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters but keep punctuation
      .replace(/[^\w\s.,!?;:()"'-]/g, '')
      // Fix common PDF extraction issues
      .replace(/\s+([.,!?;:])/g, '$1')
      // Remove multiple consecutive periods
      .replace(/\.{3,}/g, '...')
      // Trim whitespace
      .trim();
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} - Word count
   */
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get file type from file path
   * @param {string} filePath - Path to the file
   * @returns {string} - File extension
   */
  getFileType(filePath) {
    const extension = filePath.split('.').pop();
    return extension ? extension.toLowerCase() : '';
  }

  /**
   * Extract key information from text (basic keyword extraction)
   * @param {string} text - Text to extract keywords from
   * @returns {Array} - Array of extracted keywords
   */
  extractKeywords(text, limit = 20) {
    if (!text) return [];

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 
      'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'shall', 'can', 'to', 'of', 'in', 'for', 'with', 'by', 'from',
      'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
      'further', 'then', 'once'
    ]);

    // Extract words and count frequency
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Filter out pure numbers
      );

    // Count word frequencies
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Split long text into chunks for processing
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum size of each chunk
   * @returns {Array} - Array of text chunks
   */
  splitTextIntoChunks(text, chunkSize = 1000) {
    if (!text || text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    let currentChunk = '';
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= chunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence.trim();
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Validate if text extraction was successful
   * @param {Object} result - Extraction result
   * @returns {boolean} - Whether extraction was successful
   */
  isValidExtraction(result) {
    return result.success && 
           result.text && 
           result.text.length > 10 && 
           result.metadata && 
           result.metadata.wordCount > 0;
  }
}

module.exports = new PDFParser();