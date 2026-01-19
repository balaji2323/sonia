import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { 
  Upload, 
  X, 
  File, 
  FileText, 
  Image, 
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const UploadForm = observer(({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    documentType: 'other',
    keywords: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];

    selectedFiles.forEach(file => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        return;
      }

      // Check if file already selected
      if (files.find(f => f.name === file.name && f.size === file.size)) {
        toast.error(`File already selected: ${file.name}`);
        return;
      }

      validFiles.push(file);
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const mockEvent = { target: { files: droppedFiles } };
    handleFileSelect(mockEvent);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    if (!formData.category.trim()) {
      toast.error('Please enter a category');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadData = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        documentType: formData.documentType,
        keywords: formData.keywords.trim()
      };

      const response = await apiService.uploadFiles(
        '/faq/upload',
        files,
        uploadData,
        (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        }
      );

      const { processedFiles, errors } = response.data;

      if (processedFiles && processedFiles.length > 0) {
        toast.success(`Successfully uploaded ${processedFiles.length} file(s)`);
      }

      if (errors && errors.length > 0) {
        errors.forEach(error => {
          toast.error(`Failed to process ${error.filename}: ${error.error}`);
        });
      }

      // Reset form
      setFiles([]);
      setFormData({
        title: '',
        category: '',
        documentType: 'other',
        keywords: ''
      });

      // Close modal after successful upload
      if (processedFiles && processedFiles.length > 0) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image size={20} />;
    }
    if (file.type === 'application/pdf') {
      return <FileText size={20} />;
    }
    return <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload FAQ/Company Documents</h3>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-section">
            <h4>Document Information</h4>
            
            <div className="form-group">
              <label htmlFor="title">Title (Optional)</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter document title"
                disabled={isUploading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Support, Billing, Technical"
                  required
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="documentType">Document Type</label>
                <select
                  id="documentType"
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleInputChange}
                  disabled={isUploading}
                >
                  <option value="other">Other</option>
                  <option value="faq">FAQ</option>
                  <option value="policy">Policy</option>
                  <option value="guide">Guide</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="keywords">Keywords (Optional)</label>
              <input
                type="text"
                id="keywords"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="Enter keywords separated by commas"
                disabled={isUploading}
              />
              <small>Keywords help improve search results for this document</small>
            </div>
          </div>

          <div className="form-section">
            <h4>File Upload</h4>
            
            {/* File Drop Zone */}
            <div
              className="file-drop-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} />
              <h5>Drag & drop files here</h5>
              <p>or click to select files</p>
              <small>
                Supported: PDF, TXT, DOC, DOCX, Images (max 10MB each, 5 files max)
              </small>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="selected-files">
                <h5>Selected Files ({files.length})</h5>
                <div className="files-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <div className="file-icon">
                          {getFileIcon(file)}
                        </div>
                        <div className="file-details">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-file-button"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  <Loader className="spinning" size={16} />
                  <span>Uploading... {uploadProgress}%</span>
                </div>
              </div>
            )}

            {/* Upload Guidelines */}
            <div className="upload-guidelines">
              <div className="guideline-item">
                <AlertCircle size={16} />
                <span>Files will be processed to extract text content for AI responses</span>
              </div>
              <div className="guideline-item">
                <CheckCircle size={16} />
                <span>Uploaded content will be used to improve customer support responses</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="upload-button"
              disabled={files.length === 0 || isUploading || !formData.category.trim()}
            >
              {isUploading ? (
                <>
                  <Loader className="spinning" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload Files
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default UploadForm;