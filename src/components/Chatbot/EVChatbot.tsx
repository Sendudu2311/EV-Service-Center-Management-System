import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { chatbotAPI } from '../../services/api';
import toast from 'react-hot-toast';
import '../../styles/MeowlChatbot.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  blocked?: boolean;
}

interface EVChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

const EVChatbot: React.FC<EVChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language] = useState<'en' | 'vi'>('en'); // Can be extended to use context
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const WELCOME_MESSAGES = {
    en: "⚡ Welcome to EV Service Center! I'm your intelligent assistant. Ask me about appointments, services, parts, or vehicle maintenance. How can I help power up your EV today?",
    vi: "⚡ Chào mừng đến với Trung tâm Dịch vụ EV! Tôi là trợ lý thông minh của bạn. Hỏi tôi về lịch hẹn, dịch vụ, phụ tùng hoặc bảo dưỡng xe. Tôi có thể giúp gì cho xe điện của bạn hôm nay?"
  };

  const PLACEHOLDERS = {
    en: "Ask about services, appointments, or vehicle care...",
    vi: "Hỏi về dịch vụ, lịch hẹn, hoặc chăm sóc xe..."
  };

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: Message = {
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGES[language],
        timestamp: new Date()
      };
      setMessages([welcome]);
    }
  }, [isOpen, language, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage({
        message: userMessage.content,
        language,
        chatHistory: messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      const data = response.data.data as {
        message: string;
        blocked: boolean;
        timestamp?: Date;
        reason?: string;
        error?: boolean;
      } || {};

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I apologize, but I couldn\'t generate a response.',
        timestamp: new Date(),
        blocked: data.blocked || false
      }; setMessages(prev => [...prev, aiResponse]);

    } catch (error: any) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'en'
          ? 'Sorry, I\'m experiencing technical difficulties. Please try again or contact our support team.'
          : 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại hoặc liên hệ đội hỗ trợ.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-dark-300 border-2 border-lime-600 w-full max-w-2xl h-[600px] flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-dark-300 border-b-2 border-lime-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Meowl Avatar - Position and Size Adjustments */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-lime-600 flex items-center justify-center">
              <img 
                src="/meowl.png"
                alt="EV Assistant Meowl"
                className="meowl-avatar-image"
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">EV Assistant</h3>
              <p className="text-xs text-text-muted">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-lime-600 hover:bg-dark-200 border border-transparent hover:border-lime-600 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-900">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-lime-600 flex items-center justify-center"
                    style={{
                      transform: 'translateY(8px)'
                    }}
                  >
                    <img
                      src="/meowl.png"
                      alt="Assistant"
                      className="meowl-avatar-image"
                    />
                  </div>
                )}
                <div className={`rounded-lg p-3 shadow-lg ${message.role === 'user'
                    ? 'bg-lime-600 text-dark-900 border-2 border-lime-600'
                    : 'bg-dark-300 text-white border-2 border-dark-200'
                  }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0"
                  style={{
                    transform: 'translateY(8px)'
                  }}
                >
                  <img
                    src="/meowl.png"
                    alt="Assistant Loading"
                    className="w-8 h-8 rounded-full object-cover shadow-lg border-2 border-lime-600 opacity-75"
                  />
                </div>
                <div className="bg-dark-300 rounded-lg p-3 border-2 border-dark-200">
                  <div className="flex items-center space-x-2 text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-600" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-dark-300 border-t-2 border-lime-600 p-4">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={PLACEHOLDERS[language]}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-dark-900 text-white rounded-lg border-2 border-dark-200 focus:border-lime-600 focus:outline-none placeholder-text-muted transition-colors duration-200 disabled:opacity-50"
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 rounded-lg bg-lime-600 text-dark-900 font-semibold hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Ask about appointments, services, parts, or vehicle maintenance
          </p>
        </div>
      </div>
    </div>
  );
};

export default EVChatbot;
