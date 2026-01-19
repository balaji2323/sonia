const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  try {
    const healthData = {
      success: true,
      message: 'API is healthy and running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      server: {
        status: 'running',
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        nodeVersion: process.version
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.db?.databaseName || 'unknown',
        host: mongoose.connection.host || 'unknown'
      },
      services: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          keyFormat: process.env.OPENAI_API_KEY ? 'valid' : 'missing'
        },
        jwt: {
          configured: !!process.env.JWT_SECRET
        }
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

// Database connection test
router.get('/db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      success: true,
      message: 'Database connection is healthy',
      database: mongoose.connection.db.databaseName,
      readyState: mongoose.connection.readyState
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// OpenAI service test
router.get('/ai', async (req, res) => {
  try {
    const openaiService = require('../services/openaiService');
    const testResult = await openaiService.testConnection();
    
    res.json({
      success: true,
      message: 'OpenAI service test completed',
      data: testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OpenAI service test failed',
      error: error.message
    });
  }
});

module.exports = router;
