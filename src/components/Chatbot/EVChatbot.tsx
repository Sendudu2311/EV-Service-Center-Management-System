import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, Zap } from 'lucide-react';
import { chatbotAPI } from '../../services/api';
import toast from 'react-hot-toast';

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
      };      setMessages(prev => [...prev, aiResponse]);

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
      <div className="card-metal w-full max-w-2xl h-[600px] flex flex-col shadow-metal-xl"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="panel-metal border-b-2 border-copper-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-copper-500 to-copper-700 rounded-full flex items-center justify-center shadow-metal border-2 border-copper-400">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-industrial-100 text-metal">EV Assistant</h3>
              <p className="text-xs text-industrial-400">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-industrial-300 hover:text-copper-400 hover:bg-industrial-800 border border-transparent hover:border-steel-700 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-metal bg-industrial-900/50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-copper-500 to-copper-700 flex items-center justify-center shadow-metal border-2 border-copper-400 flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`rounded-lg p-3 shadow-metal ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-steel-600 to-steel-700 text-white border-2 border-steel-500'
                    : 'panel-metal text-industrial-100 border-2 border-steel-700'
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-copper-500 to-copper-700 flex items-center justify-center shadow-metal border-2 border-copper-400">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="panel-metal rounded-lg p-3 border-2 border-steel-700">
                  <div className="flex items-center space-x-2 text-industrial-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="panel-metal border-t-2 border-copper-600 p-4">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={PLACEHOLDERS[language]}
              disabled={isLoading}
              className="input-metal flex-1 px-4 py-3"
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="btn-copper px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-industrial-400 mt-2">
            Ask about appointments, services, parts, or vehicle maintenance
          </p>
        </div>
      </div>
    </div>
  );
};

export default EVChatbot;
