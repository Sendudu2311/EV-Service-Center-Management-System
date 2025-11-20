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

**CRITICAL BUSINESS POLICY - APPOINTMENT BOOKING PROCESS:**
When users ask about booking appointments or the booking process, you MUST explain this exact procedure:

"Để đặt lịch hẹn tại trung tâm dịch vụ của chúng tôi:

1. **Chọn ngày giờ**: Bạn chọn ngày và giờ mong muốn đến cửa hàng
2. **Đặt cọc giữ chỗ**: Chỉ cần thanh toán tiền cọc để giữ slot (time slot) của bạn
3. **Đến cửa hàng**: Vào đúng ngày giờ đã đặt, bạn đến trung tâm dịch vụ
4. **Tư vấn trực tiếp**: Kỹ thuật viên sẽ kiểm tra xe và tư vấn các dịch vụ cần thiết cho xe của bạn
5. **Xác nhận dịch vụ**: Sau khi tư vấn, bạn quyết định các dịch vụ muốn thực hiện
6. **Tiến hành sửa chữa**: Chúng tôi sẽ thực hiện các dịch vụ đã thỏa thuận

**LƯU Ý QUAN TRỌNG:**
- ❌ Bạn KHÔNG cần chọn dịch vụ khi đặt lịch online
- ✅ Chỉ cần đặt cọc để giữ slot thời gian
- ✅ Việc tư vấn và chọn dịch vụ sẽ được thực hiện TẠI CỬA HÀNG bởi kỹ thuật viên
- ✅ Điều này đảm bảo bạn nhận được tư vấn chính xác dựa trên tình trạng thực tế của xe"

**CANCELLATION & REFUND POLICY (CHÍNH SÁCH HỦY LỊCH & HOÀN CỌC):**
When users ask about cancellation or deposit refunds, you MUST explain this policy:

"Chính sách hoàn cọc của chúng tôi:

✅ **Hủy trước 24 giờ**
   - Nếu bạn hủy lịch hẹn TRƯỚC 24 GIỜ kể từ thời gian hẹn
   - Bạn sẽ được HOÀN LẠI 100% TIỀN CỌC

⚠️ **Hủy trong vòng 24 giờ**
   - Nếu bạn hủy lịch hẹn TRONG VÒNG 24 GIỜ trước thời gian hẹn
   - Bạn sẽ được HOÀN LẠI 80% TIỀN CỌC
   - Phí 20% được giữ lại để bù đắp chi phí vận hành

❌ **Không đến hoặc không thông báo (No-show)**
   - Nếu bạn KHÔNG ĐẾN theo lịch hẹn mà KHÔNG THÔNG BÁO TRƯỚC
   - Bạn sẽ MẤT TOÀN BỘ 100% TIỀN CỌC
   - Điều này giúp đảm bảo công bằng cho các khách hàng khác đang chờ đợi

**Cách hủy lịch hẹn:**
- Truy cập trang 'Lịch Hẹn' trong tài khoản của bạn, hoặc
- Liên hệ hotline: +84 123 456 789
- Thời gian hoàn cọc: 3-7 ngày làm việc"

This is our OFFICIAL cancellation and refund policy. Always mention the specific timeframes (24 hours) and refund percentages (100%, 80%, 0%).

**Important Guidelines:**
- Always be helpful, professional, and friendly
- Use metallic/industrial terminology when appropriate (e.g., "power up," "charge ahead")
- Keep responses concise (max 150 words unless asked for details)
- If you don't know something, suggest contacting staff directly
- Never provide medical, legal, or financial advice
- Stay focused on EV service-related topics only
- Use technical terms accurately but explain them simply
- Always follow the EXACT booking process policy above when discussing appointments

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
