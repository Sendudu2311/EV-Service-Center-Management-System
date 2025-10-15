import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System prompt for EV Service Center assistant
const SYSTEM_PROMPT = `You are an intelligent assistant for an EV (Electric Vehicle) Service Center Management System. Your name is "EV Assistant" and you help customers with:

1. **Booking Appointments**: Guide users through scheduling service appointments
2. **Service Information**: Explain available services (maintenance, repairs, diagnostics, battery checks)
3. **Parts Information**: Provide information about EV parts availability and pricing
4. **Vehicle Management**: Help with vehicle registration and service history
5. **Appointment Status**: Check and update appointment statuses
6. **General EV Knowledge**: Answer questions about EV maintenance and care

**Important Guidelines:**
- Always be helpful, professional, and friendly
- Use metallic/industrial terminology when appropriate (e.g., "power up," "charge ahead")
- Keep responses concise (max 150 words unless asked for details)
- If you don't know something, suggest contacting staff directly
- Never provide medical, legal, or financial advice
- Stay focused on EV service-related topics only
- Use technical terms accurately but explain them simply
- Encourage users to book appointments through the system

**Response Style:**
- Professional yet approachable
- Industrial/tech-savvy tone fitting the metallic theme
- Use emojis sparingly: ⚡ 🔧 🔋 🚗 when appropriate
- End with helpful next steps when possible

Remember: You represent a premium EV service center. Maintain that quality in every interaction.`;

// Configuration
const CONFIG = {
    model: 'gemini-2.0-flash-lite', // Fast and efficient model
    maxOutputTokens: 500, // Limit response length
    temperature: 0.7, // Balanced creativity and consistency
    topP: 0.9,
    topK: 40,
};

/**
 * Generate AI response using Google Gemini
 * @param {string} userMessage - The user's message
 * @param {Array} chatHistory - Previous messages for context
 * @param {string} language - User's language preference (en/vi)
 * @returns {Promise<string>} - AI generated response
 */
// Dán đoạn code này để thay thế hàm generateAIResponse cũ của bạn

export const generateAIResponse = async (userMessage, chatHistory = [], language = 'en') => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        // SỬA 1: Cung cấp SYSTEM_PROMPT khi khởi tạo model
        // Đây là cách làm đúng và hiệu quả nhất.
        const model = genAI.getGenerativeModel({
            model: CONFIG.model,
            // Thêm systemInstruction vào đây
            systemInstruction: {
                role: "model",
                parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
                maxOutputTokens: CONFIG.maxOutputTokens,
                temperature: CONFIG.temperature,
                topP: CONFIG.topP,
                topK: CONFIG.topK,
            },
        });

        // SỬA 2: Xây dựng lại lịch sử trò chuyện một cách an toàn
        // Đảm bảo vai trò (role) xen kẽ đúng user -> model -> user -> ...
        const history = chatHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        // SỬA 3: Thêm chỉ dẫn ngôn ngữ và tin nhắn mới nhất của người dùng
        const languageInstruction = language === 'vi'
            ? ' (Hãy trả lời bằng Tiếng Việt)'
            : '';

        const latestUserMessage = {
            role: 'user',
            parts: [{ text: userMessage + languageInstruction }],
        };

        // SỬA 4: Sử dụng generateContent thay vì startChat + sendMessage
        // Phương thức này đơn giản hơn và phù hợp với cách làm này.
        const result = await model.generateContent({
            contents: [...history, latestUserMessage],
        });

        const response = result.response;
        const text = response.text();

        return text.trim();

    } catch (error) {
        console.error('Gemini AI Error:', error);
        throw new Error('Failed to generate AI response');
    }
};

/**
 * Get token count estimate for a text
 * @param {string} text - Text to count tokens for
 * @returns {number} - Estimated token count
 */
export const estimateTokenCount = (text) => {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
};

/**
 * Check if message exceeds token limit
 * @param {string} message - Message to check
 * @param {number} limit - Token limit
 * @returns {boolean} - True if within limit
 */
export const isWithinTokenLimit = (message, limit = 2000) => {
    return estimateTokenCount(message) <= limit;
};

export default {
    generateAIResponse,
    estimateTokenCount,
    isWithinTokenLimit,
    CONFIG,
};
