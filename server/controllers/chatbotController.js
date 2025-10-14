import { guardUserInput, getFallbackMessage } from '../utils/chatbotGuard.js';
import { generateAIResponse, isWithinTokenLimit } from '../utils/geminiAI.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * @desc    Send message to EV Service chatbot
 * @route   POST /api/chatbot/message
 * @access  Public (can be used by anyone, even before login)
 */
export const sendChatMessage = async (req, res) => {
  try {
    const { message, language = 'en', chatHistory = [] } = req.body;

    // Validation
    if (!message || typeof message !== 'string') {
      return sendError(res, 400, 'Message is required');
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return sendError(res, 400, 'Message cannot be empty');
    }

    if (trimmedMessage.length > 1000) {
      return sendError(res, 400, 'Message too long (max 1000 characters)');
    }

    // Check token limit
    if (!isWithinTokenLimit(trimmedMessage, 500)) {
      return sendError(res, 400, 'Message exceeds token limit');
    }

    // Guard check - prevent injection and out-of-scope queries
    const guardResult = guardUserInput(trimmedMessage);
    if (!guardResult.allowed) {
      return sendSuccess(res, 200, 'Response generated', {
        message: getFallbackMessage(guardResult.reason, language),
        blocked: true,
        reason: guardResult.reason,
      });
    }

    // Limit chat history to last 10 messages for context
    const limitedHistory = chatHistory.slice(-10);

    // Generate AI response using Gemini
    const aiResponse = await generateAIResponse(
      trimmedMessage,
      limitedHistory,
      language
    );

    // Return response
    return sendSuccess(res, 200, 'Response generated', {
      message: aiResponse,
      blocked: false,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Return friendly error message
    const { language = 'en' } = req.body;
    return sendSuccess(res, 200, 'Error response', {
      message: getFallbackMessage('error', language),
      blocked: false,
      error: true,
    });
  }
};

/**
 * @desc    Get chatbot configuration and status
 * @route   GET /api/chatbot/status
 * @access  Public
 */
export const getChatbotStatus = async (req, res) => {
  try {
    const isConfigured = !!process.env.GEMINI_API_KEY;
    
    return sendSuccess(res, 200, 'Chatbot status', {
      available: isConfigured,
      model: 'gemini-1.5-flash',
      features: [
        'Appointment booking assistance',
        'Service information',
        'Parts availability',
        'Vehicle management help',
        'General EV knowledge',
      ],
      languages: ['en', 'vi'],
    });
  } catch (error) {
    console.error('Status check error:', error);
    return sendError(res, 500, 'Failed to get chatbot status');
  }
};

/**
 * @desc    Clear chat history (for future implementation with sessions)
 * @route   POST /api/chatbot/clear
 * @access  Public
 */
export const clearChatHistory = async (req, res) => {
  try {
    // For now, just return success
    // In future, can implement session-based history storage
    return sendSuccess(res, 200, 'Chat history cleared', {
      cleared: true,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Clear history error:', error);
    return sendError(res, 500, 'Failed to clear chat history');
  }
};

export default {
  sendChatMessage,
  getChatbotStatus,
  clearChatHistory,
};
