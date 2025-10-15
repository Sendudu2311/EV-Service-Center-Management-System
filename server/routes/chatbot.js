import express from 'express';
import {
  sendChatMessage,
  getChatbotStatus,
  clearChatHistory,
} from '../controllers/chatbotController.js';

const router = express.Router();

/**
 * @route   POST /api/chatbot/message
 * @desc    Send message to chatbot and get AI response
 * @access  Public
 */
router.post('/message', sendChatMessage);

/**
 * @route   GET /api/chatbot/status
 * @desc    Get chatbot availability and configuration
 * @access  Public
 */
router.get('/status', getChatbotStatus);

/**
 * @route   POST /api/chatbot/clear
 * @desc    Clear chat history
 * @access  Public
 */
router.post('/clear', clearChatHistory);

export default router;
